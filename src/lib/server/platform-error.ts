/** Error from a publishing platform. `outcome: 'unknown'` means the post may or may not have gone live. */
export class PlatformError extends Error {
	constructor(
		message: string,
		public code = 'error',
		public outcome: 'failed' | 'unknown' = 'failed'
	) {
		super(message);
	}
}
