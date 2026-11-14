import { env } from 'cloudflare:workers';
import { decrypt, encrypt } from './crypto.ts';
import type { YouTubeSettings } from '#lib/targets.ts';
import type { Adapter } from './adapters.ts';
import { mediaObject } from './media.ts';
import { PlatformError } from './platform-error.ts';
import { classifyInit, classifyPoll, classifyUpload, type Classified } from './youtube-errors.ts';

const SCOPES = ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube.readonly'];

export const redirectUri = () => `${env.ORIGIN}/auth/youtube/callback`;

export class YouTubeError extends PlatformError {}

const FRIENDLY: Record<string, string> = {
	not_connected: 'Connect a YouTube channel in Account Settings first.',
	reconnect: 'Your YouTube connection expired. Reconnect it in Account Settings.',
	invalid_grant: 'Your YouTube connection expired. Reconnect it in Account Settings.',
	missing_scope: 'Allow Mengepost to upload videos and view your YouTube account, then try again.',
	no_channel: 'This Google account has no YouTube channel. Create one on YouTube first, or pick another account.',
	access_denied: 'Authorization was cancelled.'
};

const fail = (code: string, message?: string): never => {
	throw new YouTubeError(FRIENDLY[code] ?? message ?? `YouTube error (${code})`, code);
};

export function authorizeUrl(state: string) {
	const q = new URLSearchParams({
		client_id: env.GOOGLE_CLIENT_ID,
		redirect_uri: redirectUri(),
		response_type: 'code',
		scope: SCOPES.join(' '),
		// offline + consent so Google always returns a refresh token, also on reconnect.
		access_type: 'offline',
		prompt: 'consent',
		include_granted_scopes: 'true',
		state
	});
	return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
}

async function oauth(params: Record<string, string>) {
	const res = await fetch('https://oauth2.googleapis.com/token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, ...params })
	});
	const json: any = await res.json().catch(() => ({}));
	if (!res.ok || !json.access_token) {
		console.error('youtube oauth', res.status, json.error, json.error_description);
		fail(json.error ?? 'token_exchange', json.error_description ?? 'Could not connect YouTube');
	}
	return json;
}

type Tokens = { access_token: string; refresh_token: string };
type Channel = { id: string; title: string; avatar: string };

async function myChannel(accessToken: string): Promise<Channel> {
	const res = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
		headers: { Authorization: `Bearer ${accessToken}` }
	});
	const json: any = await res.json().catch(() => ({}));
	if (!res.ok) {
		console.error('youtube channels', res.status, json.error);
		fail(json.error?.errors?.[0]?.reason ?? String(res.status), json.error?.message);
	}
	const item = json.items?.[0];
	if (!item) fail('no_channel');
	const t = item.snippet?.thumbnails ?? {};
	return { id: item.id, title: item.snippet?.title ?? '', avatar: (t.medium ?? t.default ?? {}).url ?? '' };
}

/** Exchanges the OAuth code and stores the channel for this app user. */
export async function connectAccount(userId: string, code: string) {
	const t = await oauth({ code, grant_type: 'authorization_code', redirect_uri: redirectUri() });
	const granted = String(t.scope ?? '').split(' ');
	if (!SCOPES.every((s) => granted.includes(s))) fail('missing_scope');
	if (!t.refresh_token) fail('token_exchange', 'Google did not return a refresh token. Try connecting again.');

	const channel = await myChannel(t.access_token);
	const now = Date.now();
	const token = await encrypt({ access_token: t.access_token, refresh_token: t.refresh_token } satisfies Tokens);
	// Google only sends refresh_token_expires_in for time-limited tokens (e.g. apps in "Testing").
	const refreshExpires = t.refresh_token_expires_in ? now + t.refresh_token_expires_in * 1000 : null;
	await env.DB.prepare(
		`INSERT INTO social_accounts (user_id, platform, external_id, display_name, avatar_url, token, access_expires_at, refresh_expires_at, connected_at)
		 VALUES (?, 'youtube', ?, ?, ?, ?, ?, ?, ?)
		 ON CONFLICT(user_id, platform) DO UPDATE SET external_id = excluded.external_id, display_name = excluded.display_name,
		   avatar_url = excluded.avatar_url, token = excluded.token, access_expires_at = excluded.access_expires_at,
		   refresh_expires_at = excluded.refresh_expires_at, connected_at = excluded.connected_at`
	)
		.bind(userId, channel.id, channel.title, channel.avatar, token, now + t.expires_in * 1000, refreshExpires, now)
		.run();
}

const row = (userId: string) =>
	env.DB.prepare(
		"SELECT token, access_expires_at, refresh_expires_at FROM social_accounts WHERE user_id = ? AND platform = 'youtube'"
	)
		.bind(userId)
		.first<{ token: string; access_expires_at: number; refresh_expires_at: number | null }>();

/** Valid access token for the user's YouTube channel, refreshing it when it is about to expire. */
export async function accessToken(userId: string) {
	const r = await row(userId);
	if (!r) return fail('not_connected');
	const tokens = await decrypt<Tokens>(r.token);
	if (r.access_expires_at - 5 * 60_000 > Date.now()) return tokens.access_token;
	if (r.refresh_expires_at !== null && r.refresh_expires_at < Date.now()) return fail('reconnect');

	let t: any;
	try {
		t = await oauth({ grant_type: 'refresh_token', refresh_token: tokens.refresh_token });
	} catch (e) {
		if (e instanceof YouTubeError && e.code === 'invalid_grant') fail('reconnect');
		throw e;
	}
	// Refresh responses normally omit refresh_token; keep the stored one.
	const token = await encrypt({ access_token: t.access_token, refresh_token: t.refresh_token ?? tokens.refresh_token } satisfies Tokens);
	await env.DB.prepare("UPDATE social_accounts SET token = ?, access_expires_at = ? WHERE user_id = ? AND platform = 'youtube'")
		.bind(token, Date.now() + t.expires_in * 1000, userId)
		.run();
	return t.access_token as string;
}

export async function disconnectAccount(userId: string) {
	const r = await row(userId);
	if (!r) return;
	const { refresh_token } = await decrypt<Tokens>(r.token);
	// Revoking is best effort: the token may already be revoked or expired.
	await fetch('https://oauth2.googleapis.com/revoke', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({ token: refresh_token })
	}).catch((e) => console.error('youtube revoke', e));
	await env.DB.prepare("DELETE FROM social_accounts WHERE user_id = ? AND platform = 'youtube'").bind(userId).run();
}

const raise = (c: Classified): never => {
	throw new YouTubeError(FRIENDLY[c.code] ?? c.message, c.code, c.outcome);
};

const UPLOAD_URL = 'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status';

export const youtubeAdapter: Adapter = {
	async publish({ userId, caption, media, settings }) {
		const m = media[0];
		if (!m) fail('no_video', 'Add a video before posting to YouTube.');
		const s = settings as YouTubeSettings;
		const token = await accessToken(userId);

		// Step 1: start a resumable session. Nothing is uploaded yet, so failures here are definite.
		const init = await fetch(UPLOAD_URL, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json; charset=UTF-8',
				'X-Upload-Content-Length': String(m.size),
				'X-Upload-Content-Type': m.type
			},
			body: JSON.stringify({
				snippet: { title: s.title, description: caption, categoryId: '22' },
				status: { privacyStatus: s.visibility, selfDeclaredMadeForKids: s.made_for_kids }
			})
		});
		if (!init.ok) {
			const body: any = await init.json().catch(() => ({}));
			console.error('youtube init', init.status, JSON.stringify(body?.error));
			raise(classifyInit(init.status, body));
		}
		const location = init.headers.get('Location');
		if (!location) fail('upload_failed', 'YouTube did not return an upload address. Try again.');

		// Step 3: send the bytes. From here on YouTube may have accepted the video even if we see an error.
		const obj = await mediaObject(m);
		if (!obj) fail('media_missing', 'The video file is missing. Upload it again.');
		let res: Response;
		try {
			res = await fetch(location!, {
				method: 'PUT',
				headers: { 'Content-Type': m.type, 'Content-Length': String(m.size) },
				body: obj!.body
			});
		} catch (e) {
			console.error('youtube upload', e);
			throw new YouTubeError('The connection to YouTube dropped during upload. Check your channel before retrying.', 'upload_unknown', 'unknown');
		}
		const body: any = await res.json().catch(() => ({}));
		if (res.status === 200 || res.status === 201) {
			if (!body.id) throw new YouTubeError('YouTube did not confirm the upload. Check your channel before retrying.', 'upload_unknown', 'unknown');
			return { state: 'processing', externalId: body.id as string };
		}
		console.error('youtube upload', res.status, JSON.stringify(body?.error));
		return raise(classifyUpload(res.status, body));
	},
	async poll(userId, externalId) {
		const token = await accessToken(userId);
		const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=status&id=${encodeURIComponent(externalId)}`, {
			headers: { Authorization: `Bearer ${token}` }
		});
		const body: any = await res.json().catch(() => ({}));
		if (res.status === 401) fail('reconnect');
		// A failed poll is not a verdict on the video: let the caller retry later.
		if (!res.ok) throw new YouTubeError(body?.error?.message ?? `YouTube status check failed (${res.status}).`, String(res.status), 'unknown');
		return classifyPoll(externalId, body);
	}
};
