import { error } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';
import { safeEqual } from '#lib/server/crypto.ts';
import type { RequestHandler } from './$types';

export const prerender = false;

// Called every minute by the worker's scheduled handler (scripts/wrap-worker.js).
// Publishing moves to src/lib/server/publish.ts (broadcast phase 1, Task 6).
export const POST: RequestHandler = async ({ request }) => {
	if (!safeEqual(request.headers.get('x-cron-secret') ?? '', env.APP_SECRET)) error(403, 'Forbidden');
	error(501, 'Publishing is being rebuilt for multiple platforms.');
};
