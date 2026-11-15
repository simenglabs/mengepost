import { env } from 'cloudflare:workers';
import { effectiveCaption, platformLabel, type Platform } from '#lib/platforms.ts';
import type { Privacy, PostView, Status } from '#lib/posts.ts';
import {
	derivePostStatus,
	isHttps,
	readinessError,
	shouldDeleteMedia,
	staleOutcome,
	type TargetStatus,
} from '#lib/targets.ts';
import { adapters } from './adapters.ts';
import { deleteAllMedia, mediaRows } from './media.ts';
import { PlatformError } from './platform-error.ts';
import { getPost, newRev, nextUpdatedAt, PostError, readPost, type StoredPost } from './posts.ts';
import { accessToken, creatorInfo } from './tiktok.ts';

const MAX_REASON = 500;
const unconfirmed = (p: Platform) =>
	`We could not confirm whether this was posted. Check ${platformLabel[p]} before trying again.`;
const RETRY_MARK = 'Marked as not posted. Ready to retry.';

const reason = (msg: string) => msg.slice(0, MAX_REASON);

type ReadinessCtx = { tiktokPrivacyOptions?: Privacy[]; tiktokMaxSeconds?: number };

/** A post that is not ready to publish; carries the account limits it was checked against. */
class NotReady extends PostError {
	constructor(
		message: string,
		public ctx: ReadinessCtx,
	) {
		super(message);
	}
}

/** TikTok account limits for readiness checks. Failures are left to the adapter, which records them per target. */
async function readinessCtx(v: PostView, only?: Platform[]) {
	const ctx: ReadinessCtx = {};
	if (!v.targets.some((t) => t.platform === 'tiktok') || (only && !only.includes('tiktok'))) return ctx;
	try {
		const info = await creatorInfo(await accessToken(v.user_id));
		ctx.tiktokPrivacyOptions = info.privacy_level_options;
		ctx.tiktokMaxSeconds = info.max_video_post_duration_sec;
	} catch (e) {
		if (!(e instanceof PlatformError)) console.error('creator info', v.id, e);
	}
	return ctx;
}

/**
 * Checks readiness, then in one batch claims the post (`v.status` → publishing) and moves the chosen
 * pending/failed targets to pending, then processes them.
 * The claim only applies if the post is exactly the version read (same `rev`; every edit, media change,
 * claim and status change replaces `rev`), so the content checked here is the content that gets published.
 * The target reset only applies if the post carries this claim's own new `rev`, so targets never become
 * pending without this claim, and a losing claimer can never reset another claim's targets.
 * Returns false when the post changed or was claimed since it was read.
 */
async function claimAndRun(
	v: StoredPost,
	guard: string,
	guardArgs: unknown[],
	only: Platform[] | undefined,
): Promise<boolean> {
	const ctx = await readinessCtx(v, only);
	const err = readinessError(v, ctx, only);
	if (err) throw new NotReady(err, ctx);

	const claimedAt = nextUpdatedAt(v.updated_at);
	const token = newRev();
	const platforms = only ?? v.targets.map((t) => t.platform);
	const [claim] = await env.DB.batch([
		env.DB.prepare(
			`UPDATE posts SET status = 'publishing', updated_at = ?, rev = ? WHERE id = ? AND status = ? AND rev = ?
			 AND NOT EXISTS (SELECT 1 FROM post_targets WHERE post_id = ? AND status = 'publishing') AND ${guard}`,
		).bind(claimedAt, token, v.id, v.status, v.rev, v.id, ...guardArgs),
		env.DB.prepare(
			`UPDATE post_targets SET status = 'pending', fail_reason = NULL, external_id = NULL, external_url = NULL,
			 started_at = NULL, published_at = NULL, updated_at = ?
			 WHERE post_id = ? AND status IN ('pending', 'failed') AND platform IN (${platforms.map(() => '?').join(',')})
			 AND EXISTS (SELECT 1 FROM posts WHERE id = ? AND rev = ?)`,
		).bind(claimedAt, v.id, ...platforms, v.id, token),
	]);
	if (!claim.meta.changes) return false;

	const ready = await getPost(v.user_id, v.id);
	for (const t of ready.targets) if (t.status === 'pending') await processTarget(ready, t.platform);
	await refreshPostStatus(v.id);
	return true;
}

const NO_CHECKED_TARGETS =
	"NOT EXISTS (SELECT 1 FROM post_targets WHERE post_id = ? AND status IN ('published', 'unknown'))";

/** Publishes every platform of a post whose status is one of `from`. False when it was already claimed. */
export async function publishPost(v: StoredPost, from: Status[]): Promise<boolean> {
	if (!from.includes(v.status)) return false;
	return claimAndRun(v, NO_CHECKED_TARGETS, [v.id], undefined);
}

async function setTarget(postId: string, platform: Platform, from: TargetStatus, sets: string, args: unknown[]) {
	return env.DB.prepare(
		`UPDATE post_targets SET ${sets}, updated_at = ? WHERE post_id = ? AND platform = ? AND status = ?`,
	)
		.bind(...args, Date.now(), postId, platform, from)
		.run();
}

/** Records a platform result on an in-flight target; logs when the target was no longer `publishing`. */
async function settle(postId: string, platform: Platform, sets: string, args: unknown[]) {
	const res = await setTarget(postId, platform, 'publishing', sets, args);
	if (!res.meta.changes) console.warn('target result not saved: no longer publishing', postId, platform, sets, args);
	return res;
}

/** Sends one pending target to its platform. Only one caller can claim a target. */
export async function processTarget(v: PostView, platform: Platform): Promise<void> {
	const now = Date.now();
	const claim = await env.DB.prepare(
		`UPDATE post_targets SET status = 'publishing', started_at = ?, fail_reason = NULL, updated_at = ?
		 WHERE post_id = ? AND platform = ? AND status = 'pending'`,
	)
		.bind(now, now, v.id, platform)
		.run();
	if (!claim.meta.changes) return;

	const target = v.targets.find((t) => t.platform === platform);
	const adapter = adapters[platform];
	try {
		if (!target || !adapter) throw new PlatformError(`${platformLabel[platform]} is coming soon.`, 'unsupported');
		const result = await adapter.publish({
			userId: v.user_id,
			postId: v.id,
			caption: effectiveCaption(v.caption, target.caption),
			media: await mediaRows(v.id),
			settings: target.settings,
		});
		if (result.state === 'published') {
			await settle(v.id, platform, "status = 'published', external_id = ?, external_url = ?, published_at = ?", [
				result.externalId,
				result.url,
				Date.now(),
			]);
		} else {
			await settle(v.id, platform, 'external_id = ?', [result.externalId]);
		}
	} catch (e) {
		const definite = e instanceof PlatformError && e.outcome === 'failed';
		if (!(e instanceof PlatformError)) console.error('publish', v.id, platform, e);
		const message = e instanceof PlatformError ? e.message : unconfirmed(platform);
		await settle(v.id, platform, 'status = ?, fail_reason = ?', [
			definite ? 'failed' : 'unknown',
			reason(message),
		]);
	}
}

/** The error for a lost claim: someone else is publishing, or the post was edited since it was read. */
export async function claimLost(userId: string, postId: string): Promise<PostError> {
	const now = await getPost(userId, postId);
	return now.status === 'publishing'
		? new PostError('Already publishing.', 409)
		: new PostError('This post just changed. Try again.', 409);
}

/** Retries the chosen failed platforms (default: all failed) of a failed post. */
export async function retryTargets(userId: string, postId: string, platforms?: Platform[]): Promise<PostView> {
	const v = await readPost(userId, postId);
	if (v.status === 'publishing' || v.targets.some((t) => t.status === 'publishing'))
		throw new PostError('Already publishing.', 409);
	if (v.status !== 'failed') throw new PostError('Only failed posts can be retried.', 409);
	const chosen = v.targets
		.filter((t) => t.status === 'failed' && (!platforms || platforms.includes(t.platform)))
		.map((t) => t.platform);
	if (!chosen.length) throw new PostError('Nothing to retry. Only failed platforms can be sent again.');
	if (!(await claimAndRun(v, '1 = 1', [], chosen))) throw await claimLost(userId, postId);
	return getPost(userId, postId);
}

/** The user checked the platform: it was posted, or it was not and can be retried. */
export async function resolveUnknown(
	userId: string,
	postId: string,
	platform: Platform,
	outcome: 'published' | 'retry',
	url?: string | null,
): Promise<PostView> {
	const v = await getPost(userId, postId);
	const link = url?.trim() ?? '';
	const [sets, args] =
		outcome === 'published'
			? ["status = 'published', fail_reason = NULL, external_url = COALESCE(?, external_url), published_at = ?", [
					isHttps(link) ? link.slice(0, 2000) : null,
					Date.now(),
				]]
			: ["status = 'failed', fail_reason = ?", [RETRY_MARK]];
	// The target change also replaces the post's `rev`, so an edit read before it no longer applies.
	const [res] = await env.DB.batch([
		env.DB.prepare(`UPDATE post_targets SET ${sets}, updated_at = ? WHERE post_id = ? AND platform = ? AND status = 'unknown'`).bind(
			...args,
			Date.now(),
			postId,
			platform,
		),
		env.DB.prepare(
			"UPDATE posts SET rev = ?, updated_at = MAX(?, updated_at + 1) WHERE id = ?",
		).bind(newRev(), Date.now(), postId),
	]);
	if (!res.meta.changes) throw new PostError(`${platformLabel[platform]} does not need checking.`, 409);
	await refreshPostStatus(v.id);
	return getPost(userId, postId);
}

/** Polls in-flight targets and marks ones that are stuck as needing a check. */
export async function syncPost(v: PostView): Promise<{ polled: number; stale: number }> {
	let polled = 0;
	let stale = 0;
	for (const t of v.targets) {
		if (t.status !== 'publishing') continue;
		const adapter = adapters[t.platform];
		const label = platformLabel[t.platform];
		if (t.external_id && adapter?.poll) {
			polled++;
			try {
				const r = await adapter.poll(v.user_id, t.external_id);
				if (r.state === 'published') {
					await settle(v.id, t.platform, "status = 'published', external_url = COALESCE(?, external_url), published_at = ?", [
						r.url,
						Date.now(),
					]);
					continue;
				}
				if (r.state === 'failed') {
					await settle(v.id, t.platform, "status = 'failed', fail_reason = ?", [reason(r.reason)]);
					continue;
				}
			} catch (e) {
				if (e instanceof PlatformError && (e.code === 'not_connected' || e.code === 'reconnect')) {
					const msg = `${e.message} Then check ${label} to see whether this was posted.`;
					await settle(v.id, t.platform, "status = 'unknown', fail_reason = ?", [reason(msg)]);
					continue;
				}
				console.error('poll', v.id, t.platform, e); // transient: try again next time
			}
		}
		if (staleOutcome(t, Date.now(), !!adapter?.poll) === 'unknown') {
			const res = await settle(v.id, t.platform, "status = 'unknown', fail_reason = ?", [
				unconfirmed(t.platform),
			]);
			if (res.meta.changes) stale++;
		}
	}
	await refreshPostStatus(v.id);
	return { polled, stale };
}

// Target statuses as one string, compared again in the write so it only applies to the state it was derived from.
const TARGET_STATE =
	"(SELECT group_concat(s, ',') FROM (SELECT platform || ':' || status AS s FROM post_targets WHERE post_id = ? ORDER BY platform))";
const IN_FLIGHT = "EXISTS (SELECT 1 FROM post_targets WHERE post_id = ? AND status IN ('pending', 'publishing'))";

/** Stores the post status derived from its targets; removes media once every target is published. */
export async function refreshPostStatus(postId: string): Promise<void> {
	for (let attempt = 0; attempt < 3; attempt++) {
		const [posts, rows] = await env.DB.batch<any>([
			env.DB.prepare(`SELECT status, published_at, updated_at, rev, ${TARGET_STATE} AS state FROM posts WHERE id = ?`).bind(postId, postId),
			env.DB.prepare('SELECT status, published_at FROM post_targets WHERE post_id = ?').bind(postId),
		]);
		const post = posts.results[0] as
			| { status: Status; published_at: number | null; updated_at: number; rev: string; state: string | null }
			| undefined;
		if (!post) return;
		const targets = rows.results as { status: TargetStatus; published_at: number | null }[];
		const statuses = targets.map((t) => t.status);
		const next = derivePostStatus(post.status, statuses);
		const publishedAt =
			next === 'published' ? Math.max(...targets.map((t) => t.published_at ?? 0)) || Date.now() : post.published_at;
		if (next !== post.status || publishedAt !== post.published_at) {
			// Never leave `publishing` while a target is still pending or in flight.
			const res = await env.DB.prepare(
				`UPDATE posts SET status = ?, published_at = ?, updated_at = ?, rev = ?
				 WHERE id = ? AND rev = ? AND ${TARGET_STATE} IS ? AND (? = 'publishing' OR NOT ${IN_FLIGHT})`,
			)
				.bind(next, publishedAt, nextUpdatedAt(post.updated_at), newRev(), postId, post.rev, postId, post.state, next, postId)
				.run();
			if (!res.meta.changes) continue; // the post or its targets changed meanwhile: derive again
		}
		if (shouldDeleteMedia(statuses)) await deleteAllMedia(postId);
		return;
	}
	console.warn('post status not refreshed: kept changing', postId);
}

/**
 * A due scheduled post that is no longer ready fails with the reason instead of being retried every minute.
 * Applies only to the version that failed the check (`v.rev`). Platforms that were fine are marked
 * "Not sent" rather than given another platform's reason.
 */
async function failScheduled(v: StoredPost, message: string, ctx: ReadinessCtx) {
	const token = newRev();
	await env.DB.batch([
		env.DB.prepare("UPDATE posts SET status = 'failed', updated_at = ?, rev = ? WHERE id = ? AND status = 'scheduled' AND rev = ?").bind(
			nextUpdatedAt(v.updated_at),
			token,
			v.id,
			v.rev,
		),
		...v.targets.map((t) =>
			env.DB.prepare(
				`UPDATE post_targets SET status = 'failed', fail_reason = ?, updated_at = ?
				 WHERE post_id = ? AND platform = ? AND status = 'pending' AND EXISTS (SELECT 1 FROM posts WHERE id = ? AND rev = ?)`,
			).bind(reason(readinessError(v, ctx, [t.platform]) ?? `Not sent: ${message}`), Date.now(), v.id, t.platform, v.id, token),
		),
	]);
}

/** Every minute: publish due scheduled posts, resume interrupted targets, and poll the ones in flight. */
export async function runCron(): Promise<{ due: number; claimed: number; polled: number; stale: number }> {
	const { results: due } = await env.DB.prepare(
		"SELECT id, user_id FROM posts WHERE status = 'scheduled' AND scheduled_at <= ? ORDER BY scheduled_at LIMIT 5",
	)
		.bind(Date.now())
		.all<{ id: string; user_id: string }>();
	let claimed = 0;
	// Each post is handled on its own, so one bad post cannot stop the rest of the tick.
	for (const p of due) {
		try {
			const v = await readPost(p.user_id, p.id);
			try {
				if (await publishPost(v, ['scheduled'])) claimed++;
			} catch (e) {
				if (e instanceof NotReady) await failScheduled(v, e.message, e.ctx);
				else throw e;
			}
		} catch (e) {
			console.error('cron publish', p.id, e);
		}
	}

	const { results: inFlight } = await env.DB.prepare(
		"SELECT id, user_id FROM posts WHERE status = 'publishing' ORDER BY updated_at LIMIT 20",
	).all<{ id: string; user_id: string }>();
	let polled = 0;
	let stale = 0;
	for (const p of inFlight) {
		try {
			const v = await getPost(p.user_id, p.id);
			// A Worker that stopped mid-run can leave claimed posts with pending targets.
			for (const t of v.targets) if (t.status === 'pending') await processTarget(v, t.platform);
			const r = await syncPost(await getPost(p.user_id, p.id));
			polled += r.polled;
			stale += r.stale;
		} catch (e) {
			console.error('cron sync', p.id, e);
		}
	}
	return { due: due.length, claimed, polled, stale };
}
