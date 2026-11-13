import { redirect } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(303, '/login');
	const tiktok = await env.DB.prepare('SELECT display_name, avatar_url FROM tiktok_accounts WHERE user_id = ?')
		.bind(locals.user.id)
		.first<{ display_name: string; avatar_url: string }>();
	return { user: locals.user, tiktok };
};
