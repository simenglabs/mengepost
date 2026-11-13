import { env } from 'cloudflare:workers';

const enc = new TextEncoder();

export const b64url = (b: Uint8Array) =>
	btoa(String.fromCharCode(...b))
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');

export const unb64url = (s: string) =>
	Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) =>
		c.charCodeAt(0),
	);

export const randomId = (bytes = 16) =>
	b64url(crypto.getRandomValues(new Uint8Array(bytes)));

export async function sha256(s: string) {
	return b64url(
		new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(s))),
	);
}

export function safeEqual(a: string, b: string) {
	const x = enc.encode(a);
	const y = enc.encode(b);
	// Workers-specific API, missing from the DOM SubtleCrypto type.
	const subtle = crypto.subtle as unknown as {
		timingSafeEqual(a: ArrayBufferView, b: ArrayBufferView): boolean;
	};
	if (x.length !== y.length) return false;
	if (typeof subtle.timingSafeEqual === 'function')
		return subtle.timingSafeEqual(x, y);
	// Vite's Node Web Crypto has no Workers extension. Compare every byte
	// without an early exit; production continues using the native primitive.
	let difference = 0;
	for (let i = 0; i < x.length; i++) difference |= x[i] ^ y[i];
	return difference === 0;
}

// --- AES-GCM for secrets at rest (TikTok tokens). Key derived from APP_SECRET. ---

let aes: Promise<CryptoKey> | undefined;
function key() {
	aes ??= crypto.subtle
		.digest('SHA-256', enc.encode(`${env.APP_SECRET}:tokens`))
		.then((raw) =>
			crypto.subtle.importKey('raw', raw, 'AES-GCM', false, [
				'encrypt',
				'decrypt',
			]),
		);
	return aes;
}

export async function encrypt(value: unknown) {
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const ct = await crypto.subtle.encrypt(
		{ name: 'AES-GCM', iv },
		await key(),
		enc.encode(JSON.stringify(value)),
	);
	return `${b64url(iv)}.${b64url(new Uint8Array(ct))}`;
}

export async function decrypt<T>(value: string): Promise<T> {
	const [iv, ct] = value.split('.').map(unb64url);
	const pt = await crypto.subtle.decrypt(
		{ name: 'AES-GCM', iv },
		await key(),
		ct,
	);
	return JSON.parse(new TextDecoder().decode(pt));
}
