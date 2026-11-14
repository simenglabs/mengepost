import test from 'node:test';
import assert from 'node:assert/strict';
import { chunking } from './chunking.ts';

const MB = 1024 * 1024;

test('chunking', () => {
	assert.deepEqual(chunking(3 * MB), { chunk_size: 3 * MB, total_chunk_count: 1 });
	assert.deepEqual(chunking(20 * MB), { chunk_size: 20 * MB, total_chunk_count: 1 });
	assert.deepEqual(chunking(95 * MB + 123), { chunk_size: 10 * MB, total_chunk_count: 9 }); // last chunk 15MB+123
});
