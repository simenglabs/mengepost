import { dev } from '$app/env';
import { env } from 'cloudflare:workers';
import { LOCKED, PRIVACY, type Post, type Status } from '#lib/posts.ts';
import { publishStatus, TikTokError, uploadToTikTok } from './tiktok.ts';

export class PostError extends Error {
	constructor(
		message: string,
		public status = 400,
	) {
		super(message);
	}
}

export async function listPosts(userId: string) {
	const { results } = await env.DB.prepare(
		'SELECT * FROM posts WHERE user_id = ? ORDER BY updated_at DESC',
	)
		.bind(userId)
		.all<Post>();
	return results;
}

export async function getPost(userId: string, id: string) {
	const post = await env.DB.prepare(
		'SELECT * FROM posts WHERE id = ? AND user_id = ?',
	)
		.bind(id, userId)
		.first<Post>();
	if (!post) throw new PostError('Post not found', 404);
	return post;
}

type Patch = Partial<
	Pick<
		Post,
		| 'caption'
		| 'status'
		| 'privacy'
		| 'allow_comment'
		| 'allow_duet'
		| 'allow_stitch'
		| 'brand_organic'
		| 'brand_content'
		| 'scheduled_at'
	>
>;

const FLAGS = [
	'allow_comment',
	'allow_duet',
	'allow_stitch',
	'brand_organic',
	'brand_content',
] as const;
const USER_STATUSES: Status[] = ['idea', 'draft', 'scheduled'];

/** Validates untrusted input into a patch. */
export function parsePatch(input: any): Patch {
	const patch: Patch = {};
	if (input == null || typeof input !== 'object')
		throw new PostError('Invalid body');
	if ('caption' in input) {
		if (typeof input.caption !== 'string' || input.caption.length > 2200)
			throw new PostError('Caption must be up to 2200 characters');
		patch.caption = input.caption;
	}
	if ('status' in input) {
		if (!USER_STATUSES.includes(input.status))
			throw new PostError('Invalid status');
		patch.status = input.status;
	}
	if ('privacy' in input) {
		if (input.privacy !== null && !PRIVACY.includes(input.privacy))
			throw new PostError('Invalid privacy');
		patch.privacy = input.privacy;
	}
	for (const f of FLAGS) if (f in input) patch[f] = input[f] ? 1 : 0;
	if ('scheduled_at' in input) {
		if (input.scheduled_at !== null && !Number.isFinite(input.scheduled_at))
			throw new PostError('Invalid schedule time');
		patch.scheduled_at = input.scheduled_at;
	}
	return patch;
}

/** Rules a post must satisfy to be scheduled or published. */
function readinessError(p: Post) {
	if (!p.video_key) return 'Add a video first.';
	if (!p.privacy) return 'Choose who can view this video.';
	if (p.brand_content && p.privacy === 'SELF_ONLY')
		return 'Branded content cannot be set to "Only me".';
	return null;
}

export async function createPost(userId: string, patch: Patch) {
	const now = Date.now();
	const id = crypto.randomUUID();
	await env.DB.prepare(
		'INSERT INTO posts (id, user_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
	)
		.bind(id, userId, 'idea', now, now)
		.run();
	// New posts start as idea; scheduling goes through the same validation as edits.
	return updatePost(userId, id, patch);
}

export async function updatePost(userId: string, id: string, patch: Patch) {
	const post = await getPost(userId, id);
	if (LOCKED.includes(post.status))
		throw new PostError(
			'This post is already being published and cannot be edited.',
			409,
		);

	const next = { ...post, ...patch } as Post;
	// Editing a failed post puts it back to draft unless a status was chosen.
	if (post.status === 'failed' && !patch.status) next.status = 'draft';
	if (next.status === 'scheduled') {
		const err =
			readinessError(next) ??
			(!next.scheduled_at || next.scheduled_at < Date.now() - 60_000
				? 'Pick a future date and time.'
				: null);
		if (err) throw new PostError(err);
	}
	if (next.status !== 'failed') next.fail_reason = null;

	const cols = [
		'caption',
		'status',
		'privacy',
		...FLAGS,
		'scheduled_at',
		'fail_reason',
	] as const;
	await env.DB.prepare(
		`UPDATE posts SET ${cols.map((c) => `${c} = ?`).join(', ')}, updated_at = ? WHERE id = ? AND user_id = ?`,
	)
		.bind(...cols.map((c) => next[c]), Date.now(), id, userId)
		.run();
	return getPost(userId, id);
}

export async function deletePost(userId: string, id: string) {
	const post = await getPost(userId, id);
	if (post.status === 'publishing')
		throw new PostError('Wait until publishing finishes.', 409);
	if (post.video_key) await env.MEDIA.delete(post.video_key);
	await env.DB.prepare('DELETE FROM posts WHERE id = ? AND user_id = ?')
		.bind(id, userId)
		.run();
}

/** Stores the uploaded video in R2, replacing any previous one. */
export async function attachVideo(
	userId: string,
	id: string,
	body: ReadableStream,
	meta: { name: string; type: string; size: number },
) {
	const post = await getPost(userId, id);
	if (LOCKED.includes(post.status))
		throw new PostError('This post is already being published.', 409);
	const key = `${userId}/${id}/${crypto.randomUUID()}`;
	// The local Vite-to-R2 bridge loses the request stream's known length.
	// Only buffer in development; Workers keeps streaming large uploads.
	const uploadBody = dev ? await new Response(body).arrayBuffer() : body;
	await env.MEDIA.put(key, uploadBody, {
		httpMetadata: { contentType: meta.type },
	});
	if (post.video_key) await env.MEDIA.delete(post.video_key);
	await env.DB.prepare(
		'UPDATE posts SET video_key = ?, video_name = ?, video_size = ?, video_type = ?, updated_at = ? WHERE id = ?',
	)
		.bind(key, meta.name.slice(0, 200), meta.size, meta.type, Date.now(), id)
		.run();
	return getPost(userId, id);
}

/**
 * Atomically claims a post (status in `from` → publishing) and uploads it to TikTok.
 * Returns false if another run already claimed it.
 */
export async function publishPost(post: Post, from: Status[]) {
	const err = readinessError(post);
	if (err) throw new PostError(err);
	const claim = await env.DB.prepare(
		`UPDATE posts SET status = 'publishing', fail_reason = NULL, updated_at = ?
		 WHERE id = ? AND status IN (${from.map(() => '?').join(',')})`,
	)
		.bind(Date.now(), post.id, ...from)
		.run();
	if (!claim.meta.changes) return false;

	try {
		const publishId = await uploadToTikTok(post);
		await env.DB.prepare(
			'UPDATE posts SET publish_id = ?, updated_at = ? WHERE id = ?',
		)
			.bind(publishId, Date.now(), post.id)
			.run();
	} catch (e) {
		await markFailed(
			post.id,
			e instanceof Error ? e.message : 'Publishing failed',
		);
		if (!(e instanceof TikTokError)) throw e;
	}
	return true;
}

async function markFailed(id: string, reason: string) {
	await env.DB.prepare(
		"UPDATE posts SET status = 'failed', fail_reason = ?, updated_at = ? WHERE id = ?",
	)
		.bind(reason.slice(0, 500), Date.now(), id)
		.run();
}

/** Polls TikTok for a publishing post. On success the video is removed from R2. */
export async function syncStatus(post: Post) {
	if (post.status !== 'publishing' || !post.publish_id) return post.status;
	try {
		const s = await publishStatus(post.user_id, post.publish_id);
		if (s.status === 'PUBLISH_COMPLETE') {
			if (post.video_key) await env.MEDIA.delete(post.video_key);
			await env.DB.prepare(
				"UPDATE posts SET status = 'published', published_at = ?, video_key = NULL, updated_at = ? WHERE id = ?",
			)
				.bind(Date.now(), Date.now(), post.id)
				.run();
			return 'published';
		}
		if (s.status === 'FAILED') {
			await markFailed(
				post.id,
				s.fail_reason || 'TikTok could not publish this video',
			);
			return 'failed';
		}
	} catch (e) {
		// Keep polling on transient errors; give up when the connection is gone.
		if (
			e instanceof TikTokError &&
			['not_connected', 'reconnect'].includes(e.code)
		) {
			await markFailed(post.id, e.message);
			return 'failed';
		}
		console.error('sync', post.id, e);
	}
	return post.status;
}

/** Cron: publish due scheduled posts, then poll the ones in flight. */
export async function runCron() {
	const now = Date.now();
	const { results: due } = await env.DB.prepare(
		"SELECT * FROM posts WHERE status = 'scheduled' AND scheduled_at <= ? ORDER BY scheduled_at LIMIT 5",
	)
		.bind(now)
		.all<Post>();
	let claimed = 0;
	for (const p of due)
		if (await publishPost(p, ['scheduled']).catch(() => false)) claimed++;

	const { results: inFlight } = await env.DB.prepare(
		"SELECT * FROM posts WHERE status = 'publishing' AND publish_id IS NOT NULL ORDER BY updated_at LIMIT 20",
	).all<Post>();
	for (const p of inFlight) await syncStatus(p);

	return { due: due.length, claimed, polled: inFlight.length };
}
