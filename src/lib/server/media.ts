import { dev } from '$app/env';
import { env } from 'cloudflare:workers';
import type { Media, PostView } from '#lib/posts.ts';
import { editRules } from '#lib/targets.ts';
import { FROZEN_MESSAGE, getPost, LOCKED_MESSAGE, PostError } from './posts.ts';

/** Server-side media row; `r2_key` never leaves the server. */
export type MediaRow = Media & { r2_key: string };

const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
const IMAGE_TYPES = ['image/jpeg', 'image/png'];
const MAX_VIDEO = 95 * 1024 * 1024; // Workers request body limit is 100MB
const MAX_IMAGE = 8 * 1024 * 1024;
const MAX_IMAGES = 35;
const MIXED = 'A post can have one video or up to 35 images, not both.';

/** Loads the post and rejects media changes once publishing has started or part of it is published. */
async function editablePost(userId: string, postId: string) {
	const post = await getPost(userId, postId);
	const rules = editRules(post, post.targets);
	if (rules.frozen) throw new PostError(FROZEN_MESSAGE, 409);
	if (rules.contentLocked) throw new PostError(LOCKED_MESSAGE, 409);
	return post;
}

export async function mediaRows(postId: string) {
	const { results } = await env.DB.prepare('SELECT * FROM post_media WHERE post_id = ? ORDER BY position')
		.bind(postId)
		.all<MediaRow & { created_at: number }>();
	return results;
}

/** Media may still change: the post is not claimed for publishing and nothing is published or awaiting a check. */
const EDITABLE = `EXISTS (SELECT 1 FROM posts WHERE id = ? AND status NOT IN ('publishing', 'published'))
	AND NOT EXISTS (SELECT 1 FROM post_targets WHERE post_id = ? AND status IN ('published', 'unknown'))`;
/** Bumps the post while EDITABLE. */
const touch = (postId: string) =>
	env.DB.prepare(`UPDATE posts SET updated_at = ? WHERE id = ? AND ${EDITABLE}`).bind(Date.now(), postId, postId, postId);

/**
 * Runs a media write batch that starts with `touch`. Every statement repeats EDITABLE, so a publish claim
 * between the read and this batch stops all of it; there is no gap between the check and the write.
 */
async function editBatch(statements: D1PreparedStatement[]) {
	const [touched] = await env.DB.batch(statements);
	if (!touched.meta.changes) throw new PostError(FROZEN_MESSAGE, 409);
}

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

	const post = await editablePost(userId, postId);
	if (post.media.some((m) => m.kind !== kind)) throw new PostError(MIXED);
	if (kind === 'image' && post.media.length >= MAX_IMAGES) throw new PostError(`A post can have up to ${MAX_IMAGES} images.`);

	const key = `${userId}/${postId}/${crypto.randomUUID()}`;
	// The local Vite-to-R2 bridge loses the request stream's known length.
	// Only buffer in development; Workers keeps streaming large uploads.
	const uploadBody = dev ? await new Response(body).arrayBuffer() : body;
	await env.MEDIA.put(key, uploadBody, { httpMetadata: { contentType: meta.type } });

	const old = kind === 'video' ? await mediaRows(postId) : [];
	const position = kind === 'video' ? 0 : post.media.reduce((max, m) => Math.max(max, m.position + 1), 0);
	const duration = meta.duration_ms != null && Number.isFinite(meta.duration_ms) && meta.duration_ms >= 0
		? Math.round(meta.duration_ms)
		: null;
	try {
		await editBatch([
			touch(postId),
			...old.map((m) => env.DB.prepare(`DELETE FROM post_media WHERE id = ? AND ${EDITABLE}`).bind(m.id, postId, postId)),
			env.DB.prepare(
				`INSERT INTO post_media (id, post_id, position, kind, r2_key, name, size, type, duration_ms, created_at)
				 SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE ${EDITABLE}`,
			).bind(crypto.randomUUID(), postId, position, kind, key, meta.name.slice(0, 200), meta.size, meta.type, duration, Date.now(), postId, postId),
		]);
	} catch (e) {
		await env.MEDIA.delete(key);
		throw e;
	}
	if (old.length) await env.MEDIA.delete(old.map((m) => m.r2_key));
	return getPost(userId, postId);
}

export async function removeMedia(userId: string, postId: string, mediaId: string): Promise<PostView> {
	await editablePost(userId, postId);
	const rows = await mediaRows(postId);
	const target = rows.find((m) => m.id === mediaId);
	if (!target) throw new PostError('Media not found', 404);
	const rest = rows.filter((m) => m.id !== mediaId);
	await editBatch([
		touch(postId),
		env.DB.prepare(`DELETE FROM post_media WHERE id = ? AND ${EDITABLE}`).bind(mediaId, postId, postId),
		...rest.map((m, i) =>
			env.DB.prepare(`UPDATE post_media SET position = ? WHERE id = ? AND ${EDITABLE}`).bind(i, m.id, postId, postId),
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
	await editBatch([
		touch(postId),
		...ids.map((id, i) =>
			env.DB.prepare(`UPDATE post_media SET position = ? WHERE id = ? AND post_id = ? AND ${EDITABLE}`).bind(i, id, postId, postId, postId),
		),
	]);
	return getPost(userId, postId);
}

/** Streams one media file back to the post's owner, or null when it does not exist. */
export async function openMedia(
	userId: string,
	postId: string,
	mediaId: string,
): Promise<{ media: Media; body: ReadableStream; size: number } | null> {
	const post = await getPost(userId, postId).catch((e) => {
		if (e instanceof PostError) return null;
		throw e;
	});
	if (!post?.media.some((m) => m.id === mediaId)) return null;
	const row = await env.DB.prepare('SELECT * FROM post_media WHERE id = ? AND post_id = ?')
		.bind(mediaId, postId)
		.first<MediaRow>();
	if (!row) return null;
	const obj = await mediaObject(row);
	if (!obj) return null;
	const { r2_key: _key, created_at: _created, ...media } = row as MediaRow & { created_at?: number };
	return { media, body: obj.body, size: obj.size };
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
