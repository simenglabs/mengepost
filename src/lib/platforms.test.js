import test from 'node:test';
import assert from 'node:assert/strict';
import { CAPS, PLATFORMS, contentKind, effectiveCaption, platformIssue, defaultYouTubeTitle } from './platforms.ts';

const vid = [{ kind: 'video' }];
const imgs = (n) => Array.from({ length: n }, () => ({ kind: 'image' }));

test('order and availability', () => {
	assert.deepEqual(PLATFORMS, ['tiktok', 'youtube', 'instagram', 'threads', 'x']);
	assert.deepEqual(PLATFORMS.filter((p) => CAPS[p].available), ['tiktok', 'youtube']);
});
test('contentKind', () => {
	assert.equal(contentKind([]), 'text');
	assert.equal(contentKind(vid), 'video');
	assert.equal(contentKind(imgs(3)), 'image');
});
test('effectiveCaption uses override only when non-null', () => {
	assert.equal(effectiveCaption('main', null), 'main');
	assert.equal(effectiveCaption('main', ''), '');
	assert.equal(effectiveCaption('main', 'yt'), 'yt');
});
test('platformIssue', () => {
	assert.equal(platformIssue('youtube', { media: vid, caption: 'hi' }), null);
	assert.equal(platformIssue('youtube', { media: [], caption: 'hi' }), 'YouTube needs a video.');
	assert.equal(platformIssue('tiktok', { media: imgs(2), caption: '' }), 'TikTok needs a video.');
	assert.equal(platformIssue('instagram', { media: vid, caption: '' }), 'Instagram is coming soon.');
	assert.equal(platformIssue('tiktok', { media: vid, caption: 'x'.repeat(2201) }), 'TikTok captions can be up to 2200 characters.');
	// Review Focus 5: a long main caption does not matter when the effective (override) caption is short.
	assert.equal(platformIssue('tiktok', { media: vid, caption: effectiveCaption('x'.repeat(5000), 'short') }), null);
});
test('defaultYouTubeTitle', () => {
	assert.equal(defaultYouTubeTitle('First line\nsecond'), 'First line');
	assert.equal(defaultYouTubeTitle('a'.repeat(150)), 'a'.repeat(100));
	assert.equal(defaultYouTubeTitle('Hi <b>there</b>'), 'Hi bthere/b'); // < and > are stripped
	assert.equal(defaultYouTubeTitle('  '), '');
});
