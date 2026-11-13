import { fail, redirect } from '@sveltejs/kit';
import { createSession, createUser, normalizeEmail, userCount, validPassword } from '#lib/server/auth.ts';
import type { Actions, PageServerLoad } from './$types';

export const prerender = false;

// First-run only: creates the admin account. Afterwards admins add users in Account Settings.
export const load: PageServerLoad = async () => {
	if ((await userCount()) > 0) redirect(303, '/login');
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		if ((await userCount()) > 0) redirect(303, '/login');
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const email = normalizeEmail(String(form.get('email') ?? ''));
		const password = String(form.get('password') ?? '');

		const error = !name ? 'Enter your name.' : !email.includes('@') ? 'Enter a valid email.' : validPassword(password);
		if (error) return fail(400, { name, email, error });

		const id = await createUser({ name, email, password, role: 'admin' });
		await createSession(cookies, id);
		redirect(303, '/app');
	}
};
