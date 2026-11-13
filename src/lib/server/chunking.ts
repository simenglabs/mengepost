const MB = 1024 * 1024;

// TikTok FILE_UPLOAD rules: files < 5MB must be one chunk; chunks are 5–64MB;
// total_chunk_count = floor(size / chunk_size) and the last chunk absorbs the remainder (max 128MB).
// Chunks are buffered in Worker memory (128MB limit), so keep them small: one chunk up to 20MB, else 10MB.
export function chunking(size: number) {
	const chunk_size = size <= 20 * MB ? size : 10 * MB;
	return { chunk_size, total_chunk_count: Math.floor(size / chunk_size) };
}
