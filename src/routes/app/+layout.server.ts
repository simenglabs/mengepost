import { redirect } from '@sveltejs/kit';
import { listConnections } from '#lib/server/accounts.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(303, '/login');
	const connections = await listConnections(locals.user.id);
	return { user: locals.user, connections };
};
