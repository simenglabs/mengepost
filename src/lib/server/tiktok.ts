import { env } from 'cloudflare:workers';
import type { CreatorInfo } from '#lib/posts.ts';
import type { TikTokSettings } from '#lib/targets.ts';
import type { Adapter, PublishInput } from './adapters.ts';
import { chunking } from './chunking.ts';
import { decrypt, encrypt } from './crypto.ts';
import { mediaObject } from './media.ts';
import { PlatformError } from './platform-error.ts';

const API = 'https://open.tiktokapis.com';

export const redirectUri = () => `${env.ORIGIN}/auth/callback`;

export class TikTokError extends PlatformError {}

const FRIENDLY: Record<string, string> = {
	not_connected: 'Connect a TikTok account in Account Settings first.',
	reconnect: 'Your TikTok connection expired. Reconnect it in Account Settings.',
	unaudited_client_can_only_post_to_private_accounts:
		'This app is pending TikTok review. Set your TikTok account to Private (Settings and privacy → Privacy → Private account) to post.',
	spam_risk_too_many_posts: 'You have reached the daily posting limit for this account. Try again later.',
	spam_risk_user_banned_from_posting: 'This TikTok account is currently not allowed to post.',
	privacy_level_option_mismatch: 'That privacy option is not available for this account. Choose another one.',
	access_token_invalid: 'Your TikTok connection expired. Reconnect it in Account Settings.',
	scope_not_authorized: 'Reconnect TikTok in Account Settings and allow posting videos.'
};

const fail = (code: string, message?: string): never => {
	throw new TikTokError(FRIENDLY[code] ?? message ?? `TikTok error (${code})`, code);
};

export async function api<T>(path: string, token: string, body?: unknown): Promise<T> {
	const res = await fetch(API + path, {
		method: body === undefined ? 'GET' : 'POST',
		headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=UTF-8' },
		body: body === undefined ? undefined : JSON.stringify(body)
	});
	const json: any = await res.json().catch(() => ({}));
	if (!res.ok || (json.error?.code && json.error.code !== 'ok')) {
		console.error('tiktok', path, res.status, json.error);
		fail(json.error?.code ?? String(res.status), json.error?.message);
	}
	return json.data as T;
}

async function oauth(path: string, params: Record<string, string>) {
	const res = await fetch(API + path, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({ client_key: env.TIKTOK_CLIENT_KEY, client_secret: env.TIKTOK_CLIENT_SECRET, ...params })
	});
	return (await res.json().catch(() => ({}))) as any;
}

export function authorizeUrl(state: string) {
	const q = new URLSearchParams({
		client_key: env.TIKTOK_CLIENT_KEY,
		scope: 'user.info.basic,video.publish',
		response_type: 'code',
		redirect_uri: redirectUri(),
		state
	});
	return `https://www.tiktok.com/v2/auth/authorize/?${q}`;
}

type Tokens = { access_token: string; refresh_token: string };

async function saveTokens(userId: string, t: any, profile?: { open_id: string; display_name: string; avatar_url: string }) {
	const now = Date.now();
	const token = await encrypt({ access_token: t.access_token, refresh_token: t.refresh_token } satisfies Tokens);
	const access = now + t.expires_in * 1000;
	const refresh = now + t.refresh_expires_in * 1000;
	if (profile) {
		await env.DB.prepare(
			`INSERT INTO social_accounts (user_id, platform, external_id, display_name, avatar_url, token, access_expires_at, refresh_expires_at, connected_at)
			 VALUES (?, 'tiktok', ?, ?, ?, ?, ?, ?, ?)
			 ON CONFLICT(user_id, platform) DO UPDATE SET external_id = excluded.external_id, display_name = excluded.display_name,
			   avatar_url = excluded.avatar_url, token = excluded.token, access_expires_at = excluded.access_expires_at,
			   refresh_expires_at = excluded.refresh_expires_at, connected_at = excluded.connected_at`
		)
			.bind(userId, profile.open_id, profile.display_name, profile.avatar_url, token, access, refresh, now)
			.run();
	} else {
		await env.DB.prepare("UPDATE social_accounts SET token = ?, access_expires_at = ?, refresh_expires_at = ? WHERE user_id = ? AND platform = 'tiktok'")
			.bind(token, access, refresh, userId)
			.run();
	}
}

/** Exchanges the OAuth code and stores the account for this app user. */
export async function connectAccount(userId: string, code: string) {
	const t = await oauth('/v2/oauth/token/', { code, grant_type: 'authorization_code', redirect_uri: redirectUri() });
	if (!t.access_token) fail(t.error ?? 'token_exchange', t.error_description ?? 'Could not connect TikTok');
	const { user } = await api<{ user: { open_id: string; display_name: string; avatar_url: string } }>(
		'/v2/user/info/?fields=open_id,avatar_url,display_name',
		t.access_token
	);
	await saveTokens(userId, t, { ...user, open_id: t.open_id });
}

/** Valid access token for the user's TikTok account, refreshing it when it is about to expire. */
export async function accessToken(userId: string) {
	const row = await env.DB.prepare("SELECT token, access_expires_at, refresh_expires_at FROM social_accounts WHERE user_id = ? AND platform = 'tiktok'")
		.bind(userId)
		.first<{ token: string; access_expires_at: number; refresh_expires_at: number | null }>();
	if (!row) return fail('not_connected');
	const tokens = await decrypt<Tokens>(row.token);
	if (row.access_expires_at - 5 * 60_000 > Date.now()) return tokens.access_token;
	if (row.refresh_expires_at !== null && row.refresh_expires_at < Date.now()) return fail('reconnect');

	const t = await oauth('/v2/oauth/token/', { grant_type: 'refresh_token', refresh_token: tokens.refresh_token });
	if (!t.access_token) return fail('reconnect');
	await saveTokens(userId, t);
	return t.access_token as string;
}

export async function disconnectAccount(userId: string) {
	const row = await env.DB.prepare("SELECT token FROM social_accounts WHERE user_id = ? AND platform = 'tiktok'").bind(userId).first<{ token: string }>();
	if (!row) return;
	const { access_token } = await decrypt<Tokens>(row.token);
	await oauth('/v2/oauth/revoke/', { token: access_token });
	await env.DB.prepare("DELETE FROM social_accounts WHERE user_id = ? AND platform = 'tiktok'").bind(userId).run();
}

export const creatorInfo = (token: string) => api<CreatorInfo>('/v2/post/publish/creator_info/query/', token, {});

/** Uploads the post's video from R2 to TikTok via Direct Post. Returns TikTok's publish_id. */
async function upload({ userId, caption, media, settings }: PublishInput) {
	const s = settings as TikTokSettings;
	const video = media[0];
	if (!video) fail('no_video', 'Add a video before publishing.');
	if (!s.privacy) fail('no_privacy', 'Choose who can view this video.');

	const token = await accessToken(userId);
	const info = await creatorInfo(token);
	if (!info.privacy_level_options.includes(s.privacy!)) fail('privacy_level_option_mismatch');

	const size = video.size;
	const { chunk_size, total_chunk_count } = chunking(size);

	const init = await api<{ publish_id: string; upload_url: string }>('/v2/post/publish/video/init/', token, {
		post_info: {
			title: caption.slice(0, 2200),
			privacy_level: s.privacy,
			disable_comment: !s.allow_comment || info.comment_disabled,
			disable_duet: !s.allow_duet || info.duet_disabled,
			disable_stitch: !s.allow_stitch || info.stitch_disabled,
			brand_content_toggle: !!s.brand_content,
			brand_organic_toggle: !!s.brand_organic
		},
		source_info: { source: 'FILE_UPLOAD', video_size: size, chunk_size, total_chunk_count }
	});

	// From here TikTok knows the publish_id. A rejected chunk (4xx) is a definite failure. A 5xx or a
	// network error leaves the outcome open, so the status poll decides: TikTok reports incomplete
	// uploads as FAILED and never publishes them.
	for (let i = 0; i < total_chunk_count; i++) {
		const start = i * chunk_size;
		const end = i === total_chunk_count - 1 ? size : start + chunk_size;
		const part = await mediaObject(video, { offset: start, length: end - start });
		if (!part) fail('no_video', 'The video file is missing. Upload it again.');
		let res: Response;
		try {
			res = await fetch(init.upload_url, {
				method: 'PUT',
				headers: {
					'Content-Type': video.type || 'video/mp4',
					'Content-Range': `bytes ${start}-${end - 1}/${size}`
				},
				body: await part!.arrayBuffer()
			});
		} catch (e) {
			console.error('chunk upload: no response, leaving it to the status poll', init.publish_id, i, e);
			return init.publish_id;
		}
		if (res.status >= 500) {
			console.error('chunk upload: server error, leaving it to the status poll', init.publish_id, i, res.status, await res.text().catch(() => ''));
			return init.publish_id;
		}
		if (!res.ok) {
			console.error('chunk upload', i, res.status, await res.text());
			fail('upload_failed', 'Uploading the video to TikTok failed. Try again.');
		}
	}
	return init.publish_id;
}

export const tiktokAdapter: Adapter = {
	async publish(input) {
		return { state: 'processing', externalId: await upload(input) };
	},
	async poll(userId, externalId) {
		const token = await accessToken(userId);
		const r = await api<{ status: string; fail_reason?: string }>('/v2/post/publish/status/fetch/', token, { publish_id: externalId });
		if (r.status === 'PUBLISH_COMPLETE') return { state: 'published', url: null };
		if (r.status === 'FAILED') return { state: 'failed', reason: r.fail_reason ?? 'TikTok could not publish this video.' };
		return { state: 'processing' };
	}
};
