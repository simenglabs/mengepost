import { env } from 'cloudflare:workers';
import type { Platform } from '#lib/platforms.ts';

export type Connection = { display_name: string; avatar_url: string; connected_at: number; refresh_expires_at: number | null };

/** The user's connected accounts, keyed by platform. */
export async function listConnections(userId: string): Promise<Partial<Record<Platform, Connection>>> {
	const { results } = await env.DB.prepare(
		'SELECT platform, display_name, avatar_url, connected_at, refresh_expires_at FROM social_accounts WHERE user_id = ?'
	)
		.bind(userId)
		.all<Connection & { platform: Platform }>();
	const out: Partial<Record<Platform, Connection>> = {};
	for (const { platform, ...rest } of results) out[platform] = rest;
	return out;
}
