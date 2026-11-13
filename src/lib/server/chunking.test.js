// Run: node src/lib/server/chunking.test.js
import { chunking } from './chunking.ts';

const MB = 1024 * 1024;
/** @param {unknown} a @param {unknown} b */
const eq = (a, b) => {
	if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${JSON.stringify(a)} !== ${JSON.stringify(b)}`);
};

eq(chunking(3 * MB), { chunk_size: 3 * MB, total_chunk_count: 1 });
eq(chunking(20 * MB), { chunk_size: 20 * MB, total_chunk_count: 1 });
eq(chunking(95 * MB + 123), { chunk_size: 10 * MB, total_chunk_count: 9 }); // last chunk 15MB+123
console.log('ok');
