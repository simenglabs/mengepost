import { redirect } from '@sveltejs/kit';
import { authorizeUrl } from '#lib/server/youtube.ts';
import type { RequestHandler } from './$types';

export const prerender = false;

/** Starts "Connect YouTube": redirects to Google's consent screen. */
export const GET: RequestHandler = ({ locals, cookies }) => {
	if (!locals.user) redirect(303, '/login');
	const state = crypto.randomUUID();
	cookies.set('mp_yt_state', state, { path: '/', httpOnly: true, secure: true, sameSite: 'lax', maxAge: 600 });
	// SvelteKit's redirect() only allows same-origin targets.
	return new Response(null, { status: 302, headers: { location: authorizeUrl(state) } });
};
