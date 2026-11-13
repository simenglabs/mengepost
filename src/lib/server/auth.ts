import type { Cookies } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';
import { b64url, randomId, safeEqual, sha256, unb64url } from './crypto.ts';

const ITERATIONS = 100_000; // Workers' PBKDF2 maximum
const SESSION_DAYS = 30;
const COOKIE = 'mp_sid';

export type User = { id: string; email: string; name: string; role: 'admin' | 'member' };

async function pbkdf2(password: string, salt: Uint8Array, iterations: number) {
	const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
	const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations }, base, 256);
	return b64url(new Uint8Array(bits));
}

export async function hashPassword(password: string) {
	const salt = crypto.getRandomValues(new Uint8Array(16));
	return `pbkdf2$${ITERATIONS}$${b64url(salt)}$${await pbkdf2(password, salt, ITERATIONS)}`;
}

export async function verifyPassword(password: string, stored: string) {
	const [scheme, iter, salt, hash] = stored.split('$');
	if (scheme !== 'pbkdf2') return false;
	return safeEqual(await pbkdf2(password, unb64url(salt), Number(iter)), hash);
}

export function validPassword(password: string) {
	return password.length >= 8 ? null : 'Password must be at least 8 characters.';
}

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

// --- sessions: cookie holds a random id, DB stores only its hash ---

export async function createSession(cookies: Cookies, userId: string) {
	const id = randomId(32);
	const expires = Date.now() + SESSION_DAYS * 86_400_000;
	await env.DB.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)')
		.bind(await sha256(id), userId, expires)
		.run();
	cookies.set(COOKIE, id, { path: '/', httpOnly: true, secure: true, sameSite: 'lax', maxAge: SESSION_DAYS * 86_400 });
}

export async function sessionUser(cookies: Cookies): Promise<User | null> {
	const id = cookies.get(COOKIE);
	if (!id) return null;
	return env.DB.prepare(
		`SELECT u.id, u.email, u.name, u.role FROM sessions s JOIN users u ON u.id = s.user_id
		 WHERE s.id = ? AND s.expires_at > ?`
	)
		.bind(await sha256(id), Date.now())
		.first<User>();
}

export async function destroySession(cookies: Cookies) {
	const id = cookies.get(COOKIE);
	if (id) await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(await sha256(id)).run();
	cookies.delete(COOKIE, { path: '/' });
}

export async function userCount() {
	return (await env.DB.prepare('SELECT COUNT(*) AS n FROM users').first<{ n: number }>())?.n ?? 0;
}

export async function createUser(input: { email: string; name: string; password: string; role: User['role'] }) {
	const id = crypto.randomUUID();
	await env.DB.prepare('INSERT INTO users (id, email, name, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)')
		.bind(id, normalizeEmail(input.email), input.name.trim(), await hashPassword(input.password), input.role, Date.now())
		.run();
	return id;
}
