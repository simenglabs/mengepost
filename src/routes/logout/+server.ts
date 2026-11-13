import { redirect } from '@sveltejs/kit';
import { destroySession } from '#lib/server/auth.ts';
import type { RequestHandler } from './$types';

export const prerender = false;

export const POST: RequestHandler = async ({ cookies }) => {
	await destroySession(cookies);
	redirect(303, '/login');
};
