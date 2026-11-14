import { error, fail } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';
import { createUser, hashPassword, normalizeEmail, validPassword, verifyPassword } from '#lib/server/auth.ts';
import { listConnections } from '#lib/server/accounts.ts';
import { disconnectAccount } from '#lib/server/tiktok.ts';
import { disconnectAccount as disconnectYouTube } from '#lib/server/youtube.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user!;
	const connections = await listConnections(user.id);
	const team =
		user.role === 'admin'
			? (await env.DB.prepare('SELECT id, name, email, role, created_at FROM users ORDER BY created_at').all<{
					id: string;
					name: string;
					email: string;
					role: string;
					created_at: number;
				}>()).results
			: [];
	return { // TikTok refresh tokens always expire; the null case is only for other platforms. Task 9 reworks this UI.
		account: connections.tiktok ? { ...connections.tiktok, refresh_expires_at: connections.tiktok.refresh_expires_at ?? 0 } : null, youtube: connections.youtube ?? null, team };
};

const isUnique = (e: unknown) => e instanceof Error && e.message.includes('UNIQUE');

export const actions: Actions = {
	profile: async ({ request, locals }) => {
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const email = normalizeEmail(String(form.get('email') ?? ''));
		if (!name || !email.includes('@')) return fail(400, { section: 'profile', error: 'Enter a name and a valid email.' });
		try {
			await env.DB.prepare('UPDATE users SET name = ?, email = ? WHERE id = ?').bind(name, email, locals.user!.id).run();
		} catch (e) {
			if (isUnique(e)) return fail(400, { section: 'profile', error: 'That email is already used by another account.' });
			throw e;
		}
		return { section: 'profile', ok: 'Profile saved.' };
	},

	password: async ({ request, locals }) => {
		const form = await request.formData();
		const current = String(form.get('current') ?? '');
		const next = String(form.get('next') ?? '');
		const row = await env.DB.prepare('SELECT password_hash FROM users WHERE id = ?').bind(locals.user!.id).first<{ password_hash: string }>();
		if (!row || !(await verifyPassword(current, row.password_hash))) {
			return fail(400, { section: 'password', error: 'Current password is incorrect.' });
		}
		const invalid = validPassword(next);
		if (invalid) return fail(400, { section: 'password', error: invalid });
		await env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(await hashPassword(next), locals.user!.id).run();
		return { section: 'password', ok: 'Password changed.' };
	},

	disconnect: async ({ locals }) => {
		await disconnectAccount(locals.user!.id);
		return { section: 'tiktok', ok: 'TikTok account disconnected.' };
	},

	disconnectYouTube: async ({ locals }) => {
		await disconnectYouTube(locals.user!.id);
		return { section: 'youtube', ok: 'YouTube channel disconnected.' };
	},

	addUser: async ({ request, locals }) => {
		if (locals.user!.role !== 'admin') error(403, 'Admins only');
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const email = normalizeEmail(String(form.get('email') ?? ''));
		const password = String(form.get('password') ?? '');
		const role = form.get('role') === 'admin' ? 'admin' : 'member';
		const invalid = !name ? 'Enter a name.' : !email.includes('@') ? 'Enter a valid email.' : validPassword(password);
		if (invalid) return fail(400, { section: 'team', error: invalid });
		try {
			await createUser({ name, email, password, role });
		} catch (e) {
			if (isUnique(e)) return fail(400, { section: 'team', error: 'A user with that email already exists.' });
			throw e;
		}
		return { section: 'team', ok: `${name} can now log in with ${email}.` };
	},

	removeUser: async ({ request, locals }) => {
		if (locals.user!.role !== 'admin') error(403, 'Admins only');
		const id = String((await request.formData()).get('id') ?? '');
		if (id === locals.user!.id) return fail(400, { section: 'team', error: 'You cannot remove yourself.' });
		// Clean up the user's stored videos; DB rows cascade.
		const { results } = await env.DB.prepare('SELECT video_key FROM posts WHERE user_id = ? AND video_key IS NOT NULL')
			.bind(id)
			.all<{ video_key: string }>();
		if (results.length) await env.MEDIA.delete(results.map((r) => r.video_key));
		await disconnectAccount(id).catch(() => {});
		await disconnectYouTube(id).catch(() => {});
		await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
		return { section: 'team', ok: 'User removed.' };
	}
};
