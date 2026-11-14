import type { Platform } from '#lib/platforms.ts';
import type { TargetSettings } from '#lib/targets.ts';
import type { MediaRow } from './media.ts';
import { PlatformError } from './platform-error.ts';
import { tiktokAdapter } from './tiktok.ts';

export type PublishInput = { userId: string; postId: string; caption: string; media: MediaRow[]; settings: TargetSettings };

export type PublishResult =
	| { state: 'published'; externalId: string; url: string | null }
	| { state: 'processing'; externalId: string };

export type PollResult = { state: 'processing' } | { state: 'published'; url: string | null } | { state: 'failed'; reason: string };

export interface Adapter {
	publish(i: PublishInput): Promise<PublishResult>;
	poll?(userId: string, externalId: string): Promise<PollResult>;
	/** Validates the account before publishing, e.g. TikTok creator info. */
	check?(userId: string): Promise<void>;
}

// Task 7 replaces this stub.
const youtubeAdapter: Adapter = {
	async publish() {
		throw new PlatformError('YouTube posting is not ready yet.');
	}
};

export const adapters: Partial<Record<Platform, Adapter>> = { tiktok: tiktokAdapter, youtube: youtubeAdapter };
