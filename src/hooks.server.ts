import type { Handle } from '@sveltejs/kit/hooks';
import { building } from '$app/env';
import { sessionUser } from '#lib/server/auth.ts';

export const handle: Handle = async ({ event, resolve }) => {
	// Prerendering (landing/terms/privacy) runs at build time without bindings or cookies.
	event.locals.user = building ? null : await sessionUser(event.cookies);
	return resolve(event);
};
