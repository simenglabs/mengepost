import { error, json } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';
import { safeEqual } from '#lib/server/crypto.ts';
import { runCron } from '#lib/server/posts.ts';
import type { RequestHandler } from './$types';

export const prerender = false;

// Called every minute by the worker's scheduled handler (scripts/wrap-worker.js).
export const POST: RequestHandler = async ({ request }) => {
	if (!safeEqual(request.headers.get('x-cron-secret') ?? '', env.APP_SECRET)) error(403, 'Forbidden');
	return json(await runCron());
};
