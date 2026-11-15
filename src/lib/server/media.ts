import { dev } from '$app/env';
import { env } from 'cloudflare:workers';
import type { Media, PostView } from '#lib/posts.ts';
import { editRules } from '#lib/targets.ts';
import { conflictError, FROZEN_MESSAGE, getPost, LOCKED_MESSAGE, newRev, nextUpdatedAt, PostError, readPost, type StoredPost } from './posts.ts';

/** Server-side media row; `r2_key` never leaves the server. */
export type MediaRow = Media & { r2_key: string };

const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
const IMAGE_TYPES = ['image/jpeg', 'image/png'];
const MAX_VIDEO = 95 * 1024 * 1024; // Workers request body limit is 100MB
const MAX_IMAGE = 8 * 1024 * 1024;
const MAX_IMAGES = 35;
const MIXED = 'A post can have one video or up to 35 images, not both.';

/** Loads the post and rejects media changes once publishing has started or part of it is published. */
async function editablePost(userId: string, postId: string): Promise<StoredPost> {
	const post = await readPost(userId, postId);
	const rules = editRules(post, post.targets);
	if (rules.frozen || post.targets.some((t) => t.status === 'publishing')) throw new PostError(FROZEN_MESSAGE, 409);
	if (rules.contentLocked) throw new PostError(LOCKED_MESSAGE, 409);
	return post;
}

export async function mediaRows(postId: string) {
	const { results } = await env.DB.prepare('SELECT * FROM post_media WHERE post_id = ? ORDER BY position')
		.bind(postId)
		.all<MediaRow & { created_at: number }>();
	return results;
}

/** Media may still change: the post is not claimed for publishing, no platform is in flight, and nothing is published or awaiting a check. */
const EDITABLE = `EXISTS (SELECT 1 FROM posts WHERE id = ? AND status NOT IN ('publishing', 'published'))
	AND NOT EXISTS (SELECT 1 FROM post_targets WHERE post_id = ? AND status IN ('publishing', 'published', 'unknown'))`;
/**
 * Runs a media write batch for the post version read (`post.rev`). It starts by replacing the post's `rev`
 * (so a publish claim that checked the old content no longer applies) only while the post is still that
 * version and EDITABLE; every following statement runs only if the post now carries this batch's new token,
 * so nothing applies unless the first statement did. There is no gap between the check and the write.
 */
async function editBatch(post: StoredPost, statements: (token: string) => D1PreparedStatement[]) {
	const token = newRev();
	const [touched] = await env.DB.batch([
		env.DB.prepare(`UPDATE posts SET updated_at = ?, rev = ? WHERE id = ? AND rev = ? AND ${EDITABLE}`).bind(
			nextUpdatedAt(post.updated_at),
			token,
			post.id,
			post.rev,
			post.id,
			post.id,
		),
		...statements(token),
	]);
	if (!touched.meta.changes) throw await conflictError(post.user_id, post.id);
}

/** Guard for statements after the first in `editBatch`: the post carries this batch's token. Binds (postId, token). */
const MINE = 'EXISTS (SELECT 1 FROM posts WHERE id = ? AND rev = ?)';

/** Stores an uploaded file in R2. A new video replaces the old one; images are appended. */
export async function addMedia(
	userId: string,
	postId: string,
	body: ReadableStream,
	meta: { name: string; type: string; size: number; duration_ms: number | null },
): Promise<PostView> {
	const kind = VIDEO_TYPES.includes(meta.type) ? 'video' : IMAGE_TYPES.includes(meta.type) ? 'image' : null;
	if (!kind) throw new PostError('Use an MP4, MOV or WebM video, or JPEG or PNG images.', 415);
	if (kind === 'video' && meta.size > MAX_VIDEO) throw new PostError('Video must be under 95MB.', 413);
	if (kind === 'image' && meta.size > MAX_IMAGE) throw new PostError('Images must be under 8MB each.', 413);

	const checkPost = (post: StoredPost) => {
		if (post.media.some((m) => m.kind !== kind)) throw new PostError(MIXED);
		if (kind === 'image' && post.media.length >= MAX_IMAGES) throw new PostError(`A post can have up to ${MAX_IMAGES} images.`);
	};
	checkPost(await editablePost(userId, postId));

	const key = `${userId}/${postId}/${crypto.randomUUID()}`;
	// The local Vite-to-R2 bridge loses the request stream's known length.
	// Only buffer in development; Workers keeps streaming large uploads.
	const uploadBody = dev ? await new Response(body).arrayBuffer() : body;
	await env.MEDIA.put(key, uploadBody, { httpMetadata: { contentType: meta.type } });

	const duration = meta.duration_ms != null && Number.isFinite(meta.duration_ms) && meta.duration_ms >= 0
		? Math.round(meta.duration_ms)
		: null;
	let old: MediaRow[] = [];
	try {
		// Read again after the (possibly long) upload so edits made meanwhile, such as caption autosaves,
		// do not make the write conflict; the batch then applies only to this freshly read version.
		const post = await editablePost(userId, postId);
		checkPost(post);
		old = kind === 'video' ? await mediaRows(postId) : [];
		const position = kind === 'video' ? 0 : post.media.reduce((max, m) => Math.max(max, m.position + 1), 0);
		await editBatch(post, (token) => [
			...old.map((m) => env.DB.prepare(`DELETE FROM post_media WHERE id = ? AND ${MINE}`).bind(m.id, postId, token)),
			env.DB.prepare(
				`INSERT INTO post_media (id, post_id, position, kind, r2_key, name, size, type, duration_ms, created_at)
				 SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE ${MINE}`,
			).bind(crypto.randomUUID(), postId, position, kind, key, meta.name.slice(0, 200), meta.size, meta.type, duration, Date.now(), postId, token),
		]);
	} catch (e) {
		await env.MEDIA.delete(key);
		throw e;
	}
	if (old.length) await env.MEDIA.delete(old.map((m) => m.r2_key));
	return getPost(userId, postId);
}

export async function removeMedia(userId: string, postId: string, mediaId: string): Promise<PostView> {
	const post = await editablePost(userId, postId);
	const rows = await mediaRows(postId);
	const target = rows.find((m) => m.id === mediaId);
	if (!target) throw new PostError('Media not found', 404);
	const rest = rows.filter((m) => m.id !== mediaId);
	await editBatch(post, (token) => [
		env.DB.prepare(`DELETE FROM post_media WHERE id = ? AND post_id = ? AND ${MINE}`).bind(mediaId, postId, postId, token),
		...rest.map((m, i) =>
			env.DB.prepare(`UPDATE post_media SET position = ? WHERE id = ? AND ${MINE}`).bind(i, m.id, postId, token),
		),
	]);
	await env.MEDIA.delete(target.r2_key);
	return getPost(userId, postId);
}

/** `ids` must list every media item of the post exactly once, in the new order. */
export async function reorderMedia(userId: string, postId: string, ids: string[]): Promise<PostView> {
	const post = await editablePost(userId, postId);
	const current = new Set(post.media.map((m) => m.id));
	if (ids.length !== current.size || new Set(ids).size !== ids.length || !ids.every((id) => current.has(id)))
		throw new PostError('Invalid media order.');
	await editBatch(post, (token) =>
		ids.map((id, i) =>
			env.DB.prepare(`UPDATE post_media SET position = ? WHERE id = ? AND post_id = ? AND ${MINE}`).bind(i, id, postId, postId, token),
		),
	);
	return getPost(userId, postId);
}

/** Streams one media file (or the byte range asked for in `range`) back to the post's owner, or null when it does not exist. */
export async function openMedia(
	userId: string,
	postId: string,
	mediaId: string,
	range?: Headers,
): Promise<{ media: Media; body: ReadableStream; size: number; range?: R2Range } | null> {
	const post = await getPost(userId, postId).catch((e) => {
		if (e instanceof PostError) return null;
		throw e;
	});
	if (!post?.media.some((m) => m.id === mediaId)) return null;
	const row = await env.DB.prepare('SELECT * FROM post_media WHERE id = ? AND post_id = ?')
		.bind(mediaId, postId)
		.first<MediaRow>();
	if (!row) return null;
	// R2 reads the Range header itself; an unreadable range falls back to the whole file.
	const obj = range?.has('range')
		? await env.MEDIA.get(row.r2_key, { range }).catch(() => mediaObject(row))
		: await mediaObject(row);
	if (!obj) return null;
	const { r2_key: _key, created_at: _created, ...media } = row as MediaRow & { created_at?: number };
	return { media, body: obj.body, size: obj.size, range: obj.range };
}

/** Removes every media file of a post from R2 and the database. */
export async function deleteAllMedia(postId: string): Promise<void> {
	const rows = await mediaRows(postId);
	if (rows.length) await env.MEDIA.delete(rows.map((m) => m.r2_key));
	await env.DB.prepare('DELETE FROM post_media WHERE post_id = ?').bind(postId).run();
}

/** Reads a stored media object (optionally a byte range) for platform adapters. */
export function mediaObject(m: { r2_key: string }, range?: { offset: number; length: number }): Promise<R2ObjectBody | null> {
	return env.MEDIA.get(m.r2_key, range ? { range } : undefined);
}
