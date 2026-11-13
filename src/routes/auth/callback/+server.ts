import { redirect } from '@sveltejs/kit';
import { connectAccount, TikTokError } from '#lib/server/tiktok.ts';
import type { RequestHandler } from './$types';

export const prerender = false;

// Registered TikTok redirect URI. Connects the TikTok account to the signed-in app user.
export const GET: RequestHandler = async ({ url, cookies, locals }) => {
	if (!locals.user) redirect(303, '/login');
	const back = (q: string): never => redirect(303, `/app/settings?${q}#tiktok`);

	const state = cookies.get('mp_state');
	cookies.delete('mp_state', { path: '/' });
	if (url.searchParams.get('error')) back(`tiktok_error=${encodeURIComponent(url.searchParams.get('error_description') || 'Authorization was cancelled')}`);
	const code = url.searchParams.get('code');
	if (!code || !state || url.searchParams.get('state') !== state) back('tiktok_error=Invalid%20state%2C%20please%20try%20again');

	try {
		await connectAccount(locals.user.id, code!);
	} catch (e) {
		if (!(e instanceof TikTokError)) throw e;
		back(`tiktok_error=${encodeURIComponent(e.message)}`);
	}
	return back('tiktok=connected');
};
