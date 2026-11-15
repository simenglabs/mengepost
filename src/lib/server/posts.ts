import { env } from 'cloudflare:workers';
import { CAPS, PLATFORMS, platformLabel, effectiveCaption, type Platform } from '#lib/platforms.ts';
import type { Media, Post, PostView, Status, Target } from '#lib/posts.ts';
import {
	defaultSettings,
	editRules,
	parseSettings,
	readinessError,
	type TargetSettings,
} from '#lib/targets.ts';

export class PostError extends Error {
	constructor(
		message: string,
		public status = 400,
	) {
		super(message);
	}
}

export const FROZEN_MESSAGE = 'This post is already being published and cannot be edited.';
const BUSY_MESSAGE = 'Wait until publishing finishes.';
export const LOCKED_MESSAGE = 'Part of this post is already published. Only failed platforms can be changed.';
export const CHANGED_MESSAGE = 'This post just changed. Try again.';

const MEDIA_COLS = 'm.id, m.post_id, m.position, m.kind, m.name, m.size, m.type, m.duration_ms';
/** Client-facing post columns; `rev` stays on the server. */
const POST_COLS = 'p.id, p.user_id, p.caption, p.status, p.scheduled_at, p.published_at, p.created_at, p.updated_at';

/** A post as stored, with `rev`: a random token replaced on every guarded post write. */
export type StoredPost = PostView & { rev: string };

/** A fresh write token for `posts.rev`. */
export const newRev = () => crypto.randomUUID();
/** The next `updated_at`: now, but always later than the value it replaces (for display and ordering). */
export const nextUpdatedAt = (prev: number) => Math.max(Date.now(), prev + 1);
type TargetRow = Omit<Target, 'settings'> & { settings: string };

const byPlatform = (a: Target, b: Target) => PLATFORMS.indexOf(a.platform) - PLATFORMS.indexOf(b.platform);

function toTarget(row: TargetRow): Target {
	let settings: TargetSettings = {};
	try {
		settings = JSON.parse(row.settings) as TargetSettings;
	} catch {
		// Corrupt settings read as empty; readiness checks then ask the user to fill them in.
	}
	return { ...row, settings };
}

function assemble(posts: Post[], media: Media[], targets: TargetRow[]): PostView[] {
	const views = new Map<string, PostView>(posts.map((p) => [p.id, { ...p, media: [], targets: [] }]));
	for (const m of media) views.get(m.post_id)?.media.push(m);
	for (const t of targets) views.get(t.post_id)?.targets.push(toTarget(t));
	for (const v of views.values()) v.targets.sort(byPlatform);
	return [...views.values()];
}

export async function listPosts(userId: string): Promise<PostView[]> {
	const [posts, media, targets] = await env.DB.batch<any>([
		env.DB.prepare(`SELECT ${POST_COLS} FROM posts p WHERE p.user_id = ? ORDER BY p.updated_at DESC`).bind(userId),
		env.DB.prepare(
			`SELECT ${MEDIA_COLS} FROM post_media m JOIN posts p ON p.id = m.post_id WHERE p.user_id = ? ORDER BY m.post_id, m.position`,
		).bind(userId),
		env.DB.prepare(
			'SELECT t.* FROM post_targets t JOIN posts p ON p.id = t.post_id WHERE p.user_id = ?',
		).bind(userId),
	]);
	return assemble(posts.results as Post[], media.results as Media[], targets.results as TargetRow[]);
}

/** Reads a post with its `rev`, for writes that must apply only to exactly this version. Server-only. */
export async function readPost(userId: string, id: string): Promise<StoredPost> {
	const [posts, media, targets] = await env.DB.batch<any>([
		env.DB.prepare(`SELECT ${POST_COLS}, p.rev FROM posts p WHERE p.id = ? AND p.user_id = ?`).bind(id, userId),
		env.DB.prepare(`SELECT ${MEDIA_COLS} FROM post_media m WHERE m.post_id = ? ORDER BY m.position`).bind(id),
		env.DB.prepare('SELECT * FROM post_targets WHERE post_id = ?').bind(id),
	]);
	const [view] = assemble(posts.results as Post[], media.results as Media[], targets.results as TargetRow[]);
	if (!view) throw new PostError('Post not found', 404);
	return view as StoredPost;
}

/** Reads a post for the client (without `rev`). */
export async function getPost(userId: string, id: string): Promise<PostView> {
	const { rev: _rev, ...view } = await readPost(userId, id);
	return view;
}

export type Patch = {
	caption?: string;
	status?: 'idea' | 'draft' | 'scheduled';
	scheduled_at?: number | null;
	targets?: { platform: Platform; caption: string | null; settings: unknown }[];
};

const USER_STATUSES = ['idea', 'draft', 'scheduled'] as const;
const MAX_CAPTION = 5000; // the largest platform limit; per-platform limits are checked by platformIssue

const isRecord = (v: unknown): v is Record<string, unknown> =>
	typeof v === 'object' && v !== null && !Array.isArray(v);

/** Validates untrusted input into a patch. */
export function parsePatch(input: unknown): Patch {
	if (!isRecord(input)) throw new PostError('Invalid body');
	const patch: Patch = {};
	if ('caption' in input) {
		if (typeof input.caption !== 'string' || input.caption.length > MAX_CAPTION)
			throw new PostError(`Caption must be up to ${MAX_CAPTION} characters`);
		patch.caption = input.caption;
	}
	if ('status' in input) {
		if (!USER_STATUSES.includes(input.status as (typeof USER_STATUSES)[number]))
			throw new PostError('Invalid status');
		patch.status = input.status as Patch['status'];
	}
	if ('scheduled_at' in input) {
		if (input.scheduled_at !== null && !Number.isFinite(input.scheduled_at))
			throw new PostError('Invalid schedule time');
		patch.scheduled_at = input.scheduled_at as number | null;
	}
	if ('targets' in input) {
		if (!Array.isArray(input.targets)) throw new PostError('Invalid platforms');
		const seen = new Set<Platform>();
		patch.targets = input.targets.map((t: unknown) => {
			if (!isRecord(t) || !PLATFORMS.includes(t.platform as Platform) || seen.has(t.platform as Platform))
				throw new PostError('Invalid platforms');
			const platform = t.platform as Platform;
			seen.add(platform);
			const caption = t.caption ?? null;
			if (caption !== null && (typeof caption !== 'string' || caption.length > MAX_CAPTION))
				throw new PostError(`${platformLabel[platform]} caption must be up to ${MAX_CAPTION} characters`);
			return { platform, caption, settings: t.settings ?? null };
		});
	}
	return patch;
}

const isEmpty = (s: unknown) => s == null || (isRecord(s) && Object.keys(s).length === 0);

/** Order-insensitive deep equality for JSON-like values. */
function same(a: unknown, b: unknown): boolean {
	if (isRecord(a) && isRecord(b)) {
		const ka = Object.keys(a);
		return ka.length === Object.keys(b).length && ka.every((k) => k in b && same(a[k], b[k]));
	}
	return a === b;
}

function cleanSettings(p: Platform, input: unknown, fallback: TargetSettings): TargetSettings {
	if (isEmpty(input)) return fallback;
	try {
		return parseSettings(p, input);
	} catch (e) {
		throw new PostError(e instanceof Error ? e.message : 'Invalid settings');
	}
}

export async function createPost(userId: string, patch: Patch): Promise<PostView> {
	const now = Date.now();
	const id = crypto.randomUUID();
	await env.DB.prepare('INSERT INTO posts (id, user_id, status, created_at, updated_at, rev) VALUES (?, ?, ?, ?, ?, ?)')
		.bind(id, userId, 'idea', now, now, newRev())
		.run();
	// New posts start as idea; scheduling goes through the same validation as edits.
	try {
		return await updatePost(userId, id, patch);
	} catch (e) {
		await env.DB.batch([
			env.DB.prepare('DELETE FROM post_targets WHERE post_id = ?').bind(id),
			env.DB.prepare('DELETE FROM posts WHERE id = ? AND user_id = ?').bind(id, userId),
		]);
		throw e;
	}
}

export async function updatePost(userId: string, id: string, patch: Patch): Promise<PostView> {
	const { rev, ...post } = await readPost(userId, id);
	const rules = editRules(post, post.targets);
	if (rules.frozen || post.targets.some((t) => t.status === 'publishing')) throw new PostError(FROZEN_MESSAGE, 409);

	const caption = patch.caption ?? post.caption;
	const existing = new Map(post.targets.map((t) => [t.platform, t]));
	const now = Date.now();
	let status: Status = post.status;
	let scheduledAt = patch.scheduled_at !== undefined ? patch.scheduled_at : post.scheduled_at;
	let targets: Target[];
	let writes: Target[];
	let removed: Platform[] = [];

	if (rules.contentLocked) {
		const changesPost =
			(patch.caption !== undefined && patch.caption !== post.caption) ||
			(patch.status !== undefined && patch.status !== post.status) ||
			(patch.scheduled_at !== undefined && patch.scheduled_at !== post.scheduled_at) ||
			(patch.targets?.some((t) => !existing.has(t.platform)) ?? false);
		if (changesPost) throw new PostError(LOCKED_MESSAGE, 409);
		scheduledAt = post.scheduled_at;
		writes = [];
		for (const t of patch.targets ?? []) {
			const cur = existing.get(t.platform)!;
			const settings = cleanSettings(t.platform, t.settings, cur.settings);
			if (cur.status === 'failed') {
				writes.push({ ...cur, caption: t.caption, settings, updated_at: now });
			} else if (t.caption !== cur.caption || !same(settings, cur.settings)) {
				throw new PostError(LOCKED_MESSAGE, 409);
			}
		}
		const written = new Map(writes.map((t) => [t.platform, t]));
		targets = post.targets.map((t) => written.get(t.platform) ?? t);
	} else {
		// Editing a failed post puts it (and its platforms) back to draft unless a status was chosen.
		const reset = post.status === 'failed';
		status = patch.status ?? (reset ? 'draft' : post.status);
		const wanted =
			patch.targets ?? post.targets.map((t) => ({ platform: t.platform, caption: t.caption, settings: t.settings }));
		targets = wanted.map((t) => {
			const cur = existing.get(t.platform);
			if (!cur && !CAPS[t.platform].available) throw new PostError(`${platformLabel[t.platform]} is coming soon.`);
			const fallback = cur?.settings ?? defaultSettings(t.platform, effectiveCaption(caption, t.caption));
			const settings = cleanSettings(t.platform, t.settings, fallback);
			const base: Target = cur ?? {
				post_id: id,
				platform: t.platform,
				status: 'pending',
				caption: null,
				settings,
				external_id: null,
				external_url: null,
				fail_reason: null,
				started_at: null,
				published_at: null,
				updated_at: now,
			};
			const next: Target = { ...base, caption: t.caption, settings, updated_at: now };
			return reset
				? { ...next, status: 'pending', external_id: null, external_url: null, fail_reason: null, started_at: null, published_at: null }
				: next;
		});
		targets.sort(byPlatform);
		writes = targets;
		removed = post.targets.map((t) => t.platform).filter((p) => !targets.some((t) => t.platform === p));
	}

	const next: PostView = { ...post, caption, status, scheduled_at: scheduledAt, targets };
	if (next.status === 'scheduled') {
		const err =
			readinessError(next) ??
			(!next.scheduled_at || next.scheduled_at < now - 60_000 ? 'Pick a future date and time.' : null);
		if (err) throw new PostError(err);
	}

	// The post update only applies to exactly the version read (`rev`): any claim, status change, media
	// change or other edit since then replaced it. Target writes are guarded on the post carrying this
	// edit's own new token, so they apply only together with this edit's post update, never on their own.
	const token = newRev();
	const guard = 'EXISTS (SELECT 1 FROM posts WHERE id = ? AND rev = ?)';
	const statements = [
		env.DB.prepare(
			`UPDATE posts SET caption = ?, status = ?, scheduled_at = ?, updated_at = ?, rev = ?
			 WHERE id = ? AND user_id = ? AND status = ? AND rev = ?
			 AND NOT EXISTS (SELECT 1 FROM post_targets WHERE post_id = ? AND status = 'publishing')`,
		).bind(next.caption, next.status, next.scheduled_at, nextUpdatedAt(post.updated_at), token, id, userId, post.status, rev, id),
	];
	if (removed.length) {
		statements.push(
			env.DB.prepare(
				`DELETE FROM post_targets WHERE post_id = ? AND platform IN (${removed.map(() => '?').join(',')}) AND ${guard}`,
			).bind(id, ...removed, id, token),
		);
	}
	for (const t of writes) {
		statements.push(
			env.DB.prepare(
				`INSERT INTO post_targets (post_id, platform, status, caption, settings, external_id, external_url, fail_reason, started_at, published_at, updated_at)
				 SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE ${guard}
				 ON CONFLICT (post_id, platform) DO UPDATE SET status = excluded.status, caption = excluded.caption,
				 settings = excluded.settings, external_id = excluded.external_id, external_url = excluded.external_url,
				 fail_reason = excluded.fail_reason, started_at = excluded.started_at, published_at = excluded.published_at,
				 updated_at = excluded.updated_at`,
			).bind(
				id,
				t.platform,
				t.status,
				t.caption,
				JSON.stringify(t.settings),
				t.external_id,
				t.external_url,
				t.fail_reason,
				t.started_at,
				t.published_at,
				t.updated_at,
				id,
				token,
			),
		);
	}
	const [claimed] = await env.DB.batch(statements);
	if (!claimed.meta.changes) throw await conflictError(userId, id);
	return getPost(userId, id);
}

/** The 409 for a guarded write that no longer applied: publishing started, or the post changed since it was read. */
export async function conflictError(userId: string, id: string): Promise<PostError> {
	const now = await getPost(userId, id);
	const busy = now.status === 'publishing' || now.targets.some((t) => t.status === 'publishing');
	return new PostError(busy ? FROZEN_MESSAGE : CHANGED_MESSAGE, 409);
}

export async function deletePost(userId: string, id: string): Promise<void> {
	const post = await getPost(userId, id);
	if (post.status === 'publishing' || post.targets.some((t) => t.status === 'publishing'))
		throw new PostError(BUSY_MESSAGE, 409);
	// Every delete repeats the not-publishing condition, so a publish claim in between stops all of them.
	const guard = `EXISTS (SELECT 1 FROM posts WHERE id = ? AND user_id = ? AND status != 'publishing')
		AND NOT EXISTS (SELECT 1 FROM post_targets WHERE post_id = ? AND status = 'publishing')`;
	const [media, , deleted] = await env.DB.batch<{ r2_key: string }>([
		env.DB.prepare(`DELETE FROM post_media WHERE post_id = ? AND ${guard} RETURNING r2_key`).bind(id, id, userId, id),
		env.DB.prepare(`DELETE FROM post_targets WHERE post_id = ? AND ${guard}`).bind(id, id, userId, id),
		env.DB.prepare(`DELETE FROM posts WHERE id = ? AND ${guard}`).bind(id, id, userId, id),
	]);
	if (!deleted.meta.changes) throw new PostError(BUSY_MESSAGE, 409);
	if (media.results.length) await env.MEDIA.delete(media.results.map((m) => m.r2_key));
}
