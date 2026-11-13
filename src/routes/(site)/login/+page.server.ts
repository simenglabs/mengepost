import { fail, redirect } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';
import { createSession, normalizeEmail, userCount, verifyPassword } from '#lib/server/auth.ts';
import type { Actions, PageServerLoad } from './$types';

export const prerender = false;

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) redirect(303, '/app');
	return { setup: (await userCount()) === 0 };
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const form = await request.formData();
		const email = normalizeEmail(String(form.get('email') ?? ''));
		const password = String(form.get('password') ?? '');

		const user = await env.DB.prepare('SELECT id, password_hash FROM users WHERE email = ?')
			.bind(email)
			.first<{ id: string; password_hash: string }>();
		// Same message for unknown email and wrong password.
		if (!user || !(await verifyPassword(password, user.password_hash))) {
			return fail(400, { email, error: 'Incorrect email or password.' });
		}
		await createSession(cookies, user.id);
		redirect(303, '/app');
	}
};
