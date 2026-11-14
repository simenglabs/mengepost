import { error, json, type RequestEvent } from '@sveltejs/kit';
import { PostError } from './posts.ts';
import { PlatformError } from './platform-error.ts';

export function requireUser(event: RequestEvent) {
	if (!event.locals.user) error(401, 'Not signed in');
	return event.locals.user;
}

/** Runs an API handler, mapping domain errors to JSON error responses. */
export async function handle<T>(fn: () => Promise<T>) {
	try {
		return json(await fn());
	} catch (e) {
		if (e instanceof PostError) return json({ message: e.message }, { status: e.status });
		if (e instanceof PlatformError) return json({ message: e.message, code: e.code }, { status: 502 });
		throw e;
	}
}
