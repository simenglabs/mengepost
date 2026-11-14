import { redirect } from '@sveltejs/kit';
import { connectAccount, YouTubeError } from '#lib/server/youtube.ts';
import type { RequestHandler } from './$types';

export const prerender = false;

// Registered Google OAuth redirect URI. Connects the YouTube channel to the signed-in app user.
export const GET: RequestHandler = async ({ url, cookies, locals }) => {
	if (!locals.user) redirect(303, '/login');
	const back = (q: string): never => redirect(303, `/app/settings?${q}#youtube`);
	const err = (m: string) => back(`youtube_error=${encodeURIComponent(m)}`);

	const state = cookies.get('mp_yt_state');
	cookies.delete('mp_yt_state', { path: '/' });
	if (url.searchParams.get('error')) {
		err(url.searchParams.get('error') === 'access_denied' ? 'Authorization was cancelled.' : 'Google could not authorize YouTube.');
	}
	const code = url.searchParams.get('code');
	if (!code || !state || url.searchParams.get('state') !== state) err('Invalid state, please try again.');

	try {
		await connectAccount(locals.user.id, code!);
	} catch (e) {
		if (!(e instanceof YouTubeError)) throw e;
		err(e.message);
	}
	return back('youtube=connected');
};
