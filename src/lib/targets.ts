// Shared by client and server: keep pure (no `cloudflare:workers`, no `$app/*`) and erasable-only TypeScript.
import { PLATFORMS, platformLabel, platformIssue, effectiveCaption, defaultYouTubeTitle } from './platforms.ts';
import type { Platform } from './platforms.ts';
import type { Privacy, Status, PostView } from './posts.ts';

export type TargetStatus = 'pending' | 'publishing' | 'published' | 'failed' | 'unknown';

export type TikTokSettings = {
	privacy: Privacy | null;
	allow_comment: boolean;
	allow_duet: boolean;
	allow_stitch: boolean;
	brand_organic: boolean;
	brand_content: boolean;
};
export type YouTubeVisibility = 'public' | 'unlisted' | 'private';
export type YouTubeSettings = { title: string; visibility: YouTubeVisibility | null; made_for_kids: boolean | null };
export type TargetSettings = TikTokSettings | YouTubeSettings | Record<string, never>;

type Ctx = { tiktokPrivacyOptions?: Privacy[]; videoSeconds?: number | null; tiktokMaxSeconds?: number };

const PRIVACY_VALUES: Privacy[] = ['PUBLIC_TO_EVERYONE', 'MUTUAL_FOLLOW_FRIENDS', 'FOLLOWER_OF_CREATOR', 'SELF_ONLY'];
const VISIBILITIES: YouTubeVisibility[] = ['public', 'unlisted', 'private'];

export function defaultSettings(p: Platform, caption: string): TargetSettings {
	if (p === 'tiktok') {
		return { privacy: null, allow_comment: false, allow_duet: false, allow_stitch: false, brand_organic: false, brand_content: false };
	}
	if (p === 'youtube') return { title: defaultYouTubeTitle(caption), visibility: null, made_for_kids: null };
	return {};
}

function asObject(input: unknown, p: Platform): Record<string, unknown> {
	if (typeof input !== 'object' || input === null || Array.isArray(input)) {
		throw new Error(`Invalid ${platformLabel[p]} settings.`);
	}
	return input as Record<string, unknown>;
}

/** Untrusted input to clean settings. Throws an Error with a message for the wrong shape. */
export function parseSettings(p: Platform, input: unknown): TargetSettings {
	if (p === 'tiktok') {
		const o = asObject(input, p);
		const privacy = o.privacy ?? null;
		if (privacy !== null && !PRIVACY_VALUES.includes(privacy as Privacy)) throw new Error('Invalid TikTok privacy option.');
		return {
			privacy: privacy as Privacy | null,
			allow_comment: !!o.allow_comment,
			allow_duet: !!o.allow_duet,
			allow_stitch: !!o.allow_stitch,
			brand_organic: !!o.brand_organic,
			brand_content: !!o.brand_content
		};
	}
	if (p === 'youtube') {
		const o = asObject(input, p);
		if (typeof o.title !== 'string') throw new Error('Invalid YouTube title.');
		const visibility = o.visibility ?? null;
		if (visibility !== null && !VISIBILITIES.includes(visibility as YouTubeVisibility)) {
			throw new Error('Invalid YouTube visibility.');
		}
		const kids = o.made_for_kids ?? null;
		if (kids !== null && typeof kids !== 'boolean') throw new Error('Invalid YouTube made-for-kids value.');
		return { title: o.title, visibility: visibility as YouTubeVisibility | null, made_for_kids: kids };
	}
	return {};
}

export function settingsIssue(p: Platform, s: TargetSettings, ctx: Ctx): string | null {
	if (p === 'tiktok') {
		const t = s as TikTokSettings;
		if (!t.privacy) return 'Choose who can view this video.';
		if (ctx.tiktokPrivacyOptions && !ctx.tiktokPrivacyOptions.includes(t.privacy)) {
			return 'That privacy option is not available for this account. Choose another one.';
		}
		if (t.brand_content && t.privacy === 'SELF_ONLY') return 'Branded content cannot be set to "Only me".';
		if (ctx.videoSeconds != null && ctx.tiktokMaxSeconds != null && ctx.videoSeconds > ctx.tiktokMaxSeconds) {
			return 'Choose a shorter video for TikTok.';
		}
		return null;
	}
	if (p === 'youtube') {
		const y = s as YouTubeSettings;
		if (!y.title.trim()) return 'Add a YouTube title.';
		if (y.title.length > 100 || /[<>]/.test(y.title)) return 'YouTube titles can be up to 100 characters, without < or >.';
		if (!y.visibility) return 'Choose the YouTube visibility.';
		if (y.made_for_kids === null) return 'Tell YouTube whether this video is made for kids.';
		return null;
	}
	return null;
}

export function derivePostStatus(current: Status, targets: TargetStatus[]): Status {
	if (targets.length === 0) return current;
	if ((current === 'idea' || current === 'draft' || current === 'scheduled') && targets.every((t) => t === 'pending')) {
		return current;
	}
	if (targets.every((t) => t === 'published')) return 'published';
	if (targets.some((t) => t === 'pending' || t === 'publishing')) return 'publishing';
	return 'failed';
}

export function editRules(post: { status: Status }, targets: { status: TargetStatus }[]) {
	const frozen = post.status === 'publishing' || post.status === 'published';
	const contentLocked = targets.some((t) => t.status === 'published' || t.status === 'unknown');
	return {
		frozen,
		contentLocked,
		editable: (t: TargetStatus) => !frozen && (!contentLocked || t === 'failed')
	};
}

export const STALE_MS = 15 * 60_000;
export const PROCESSING_GIVE_UP_MS = 24 * 3_600_000;

export function staleOutcome(
	t: { status: TargetStatus; external_id: string | null; started_at: number | null },
	now: number,
	canPoll: boolean
): 'unknown' | null {
	if (t.status !== 'publishing') return null;
	const age = now - (t.started_at ?? now);
	if (!t.external_id) return age > STALE_MS ? 'unknown' : null;
	return !canPoll || age > PROCESSING_GIVE_UP_MS ? 'unknown' : null;
}

export function shouldDeleteMedia(targets: TargetStatus[]): boolean {
	return targets.length > 0 && targets.every((t) => t === 'published');
}

export function readinessError(
	v: PostView,
	ctx: { tiktokPrivacyOptions?: Privacy[]; tiktokMaxSeconds?: number } = {},
	only?: Platform[]
): string | null {
	if (v.targets.length === 0) return 'Choose at least one platform.';
	const video = v.media.find((m) => m.kind === 'video');
	const videoSeconds = video?.duration_ms != null ? video.duration_ms / 1000 : null;
	for (const platform of PLATFORMS) {
		if (only && !only.includes(platform)) continue;
		const target = v.targets.find((t) => t.platform === platform);
		if (!target) continue;
		const label = platformLabel[platform];
		const msg =
			platformIssue(platform, { media: v.media, caption: effectiveCaption(v.caption, target.caption) }) ??
			settingsIssue(platform, target.settings, { ...ctx, videoSeconds });
		if (msg) return msg.includes(label) ? msg : `${label}: ${msg}`;
	}
	return null;
}
