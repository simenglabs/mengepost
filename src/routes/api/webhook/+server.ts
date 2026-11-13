import { env } from 'cloudflare:workers';
import type { RequestHandler } from './$types';

export const prerender = false;

// TikTok-Signature: "t=<unix>,s=<hex hmac-sha256(client_secret, `${t}.${body}`)>"
async function verify(header: string | null, body: string, secret: string) {
	const parts = Object.fromEntries((header ?? '').split(',').map((kv) => kv.split('=')));
	if (!parts.t || !parts.s) return false;
	const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
	const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${parts.t}.${body}`)));
	const hex = [...mac].map((b) => b.toString(16).padStart(2, '0')).join('');
	return hex === parts.s;
}

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.text();
	const ok = await verify(request.headers.get('tiktok-signature'), body, env.TIKTOK_CLIENT_SECRET);
	if (!ok) return new Response('invalid signature', { status: 401 });

	// ponytail: events are only logged (post status lives in /api/status polling).
	// Handle e.g. "post.publish.complete" / "authorization.removed" here when needed.
	console.log('tiktok webhook', body);
	return new Response('ok');
};
