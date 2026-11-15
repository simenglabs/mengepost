import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyInit, classifyUpload, classifyPoll } from './youtube-errors.ts';

const err = (reason, message = 'x') => ({ error: { message, errors: [{ reason }] } });

test('init classification', () => {
	assert.deepEqual(classifyInit(401, {}), { outcome: 'failed', code: 'reconnect', message: '' });
	assert.match(classifyInit(403, err('quotaExceeded')).message, /quota is used up/);
	assert.match(classifyInit(400, err('uploadLimitExceeded')).message, /upload limit/);
	assert.equal(classifyInit(500, {}).outcome, 'failed');
});

test('upload classification', () => {
	assert.equal(classifyUpload(401, {}).code, 'reconnect');
	assert.equal(classifyUpload(400, err('invalidTitle', 'bad title')).outcome, 'failed');
	assert.equal(classifyUpload(400, err('invalidTitle', 'bad title')).message, 'bad title');
	assert.equal(classifyUpload(500, {}).outcome, 'unknown');
	assert.equal(classifyUpload(503, {}).outcome, 'unknown');
	assert.equal(classifyUpload(302, {}).outcome, 'unknown');
});

test('poll classification', () => {
	const item = (s) => ({ items: [{ status: s }] });
	assert.deepEqual(classifyPoll('abc', item({ uploadStatus: 'processed' })), { state: 'published', url: 'https://www.youtube.com/watch?v=abc' });
	assert.deepEqual(classifyPoll('abc', item({ uploadStatus: 'uploaded' })), { state: 'processing' });
	assert.deepEqual(classifyPoll('abc', item({ uploadStatus: 'rejected', rejectionReason: 'duplicate' })), { state: 'failed', reason: 'duplicate' });
	assert.deepEqual(classifyPoll('abc', item({ uploadStatus: 'failed', failureReason: 'codec' })), { state: 'failed', reason: 'codec' });
	assert.equal(classifyPoll('abc', item({ uploadStatus: 'deleted' })).state, 'failed');
	assert.deepEqual(classifyPoll('abc', { items: [] }), { state: 'processing' });
	assert.deepEqual(classifyPoll('abc', {}), { state: 'processing' });
});
