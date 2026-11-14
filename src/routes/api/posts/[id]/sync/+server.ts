import { error } from '@sveltejs/kit';
import { requireUser } from '#lib/server/http.ts';
import type { RequestHandler } from './$types';

export const prerender = false;

// Publishing moves to src/lib/server/publish.ts (broadcast phase 1, Task 6).
export const POST: RequestHandler = async (event) => {
	requireUser(event);
	error(501, 'Publishing is being rebuilt for multiple platforms.');
};
