// Pure helpers (no Workers imports) so they can be unit-tested with node:test.

export type Classified = { outcome: 'failed' | 'unknown'; code: string; message: string };

const REASONS: Record<string, string> = {
	quotaExceeded: 'YouTube upload quota is used up for today. Try again tomorrow.',
	uploadLimitExceeded: 'This channel has reached its YouTube upload limit. Try again later.'
};

/** Session-start response (step 1): nothing was uploaded yet, so every rejection is definite. */
export function classifyInit(status: number, body: any): Classified {
	if (status === 401) return { outcome: 'failed', code: 'reconnect', message: '' };
	const reason: string | undefined = body?.error?.errors?.[0]?.reason;
	const message = (reason && REASONS[reason]) || body?.error?.message || `YouTube rejected the upload (${status}).`;
	return { outcome: 'failed', code: reason ?? String(status), message };
}

/** Byte upload response (step 3): 4xx is a definite rejection, anything else may have been accepted. */
export function classifyUpload(status: number, body: any): Classified {
	if (status === 401) return { outcome: 'failed', code: 'reconnect', message: '' };
	if (status >= 400 && status < 500) {
		const reason: string | undefined = body?.error?.errors?.[0]?.reason;
		const message = (reason && REASONS[reason]) || body?.error?.message || `YouTube rejected the video (${status}).`;
		return { outcome: 'failed', code: reason ?? String(status), message };
	}
	return { outcome: 'unknown', code: 'upload_unknown', message: 'YouTube did not confirm the upload. Check your channel before retrying.' };
}

export type PollOutcome = { state: 'processing' } | { state: 'published'; url: string } | { state: 'failed'; reason: string };

/** Maps a videos.list?part=status response to a poll result. */
export function classifyPoll(id: string, body: any): PollOutcome {
	const status = body?.items?.[0]?.status;
	if (!status) return { state: 'failed', reason: 'YouTube removed this video.' };
	switch (status.uploadStatus) {
		case 'processed':
			return { state: 'published', url: `https://www.youtube.com/watch?v=${id}` };
		case 'rejected':
		case 'failed':
		case 'deleted':
			return { state: 'failed', reason: status.rejectionReason ?? status.failureReason ?? `YouTube marked this video as ${status.uploadStatus}.` };
		default:
			return { state: 'processing' };
	}
}
