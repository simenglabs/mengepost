import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	derivePostStatus,
	shouldDeleteMedia,
	editRules,
	staleOutcome,
	STALE_MS,
	PROCESSING_GIVE_UP_MS,
	readinessError,
	settingsIssue,
	parseSettings,
	defaultSettings
} from './targets.ts';

test('derivePostStatus', () => {
	assert.equal(derivePostStatus('draft', ['pending', 'pending']), 'draft');
	assert.equal(derivePostStatus('publishing', ['published', 'publishing']), 'publishing');
	assert.equal(derivePostStatus('publishing', ['published', 'failed']), 'failed');
	assert.equal(derivePostStatus('publishing', ['published', 'unknown']), 'failed');
	assert.equal(derivePostStatus('publishing', ['published', 'published']), 'published');
	assert.equal(derivePostStatus('publishing', ['pending']), 'publishing');
	assert.equal(derivePostStatus('draft', []), 'draft');
});

test('shouldDeleteMedia', () => {
	assert.equal(shouldDeleteMedia(['published', 'publishing']), false);
	assert.equal(shouldDeleteMedia(['published', 'failed']), false);
	assert.equal(shouldDeleteMedia(['published', 'published']), true);
	assert.equal(shouldDeleteMedia([]), false);
});

test('editRules', () => {
	assert.equal(editRules({ status: 'draft' }, [{ status: 'failed' }]).contentLocked, false);
	const r = editRules({ status: 'failed' }, [{ status: 'published' }, { status: 'failed' }]);
	assert.equal(r.contentLocked, true);
	assert.equal(r.editable('failed'), true);
	assert.equal(r.editable('published'), false);
	const f = editRules({ status: 'publishing' }, [{ status: 'failed' }]);
	assert.equal(f.frozen, true);
	assert.equal(f.editable('failed'), false);
});

test('staleOutcome', () => {
	const now = 10_000_000;
	const t = (o) => ({ status: 'publishing', external_id: null, started_at: now, ...o });
	assert.equal(staleOutcome(t({ started_at: now - STALE_MS - 1 }), now, true), 'unknown');
	assert.equal(staleOutcome(t({ started_at: now - 1000 }), now, true), null);
	assert.equal(staleOutcome(t({ external_id: 'abc', started_at: now - STALE_MS - 1 }), now, true), null);
	assert.equal(
		staleOutcome(t({ external_id: 'abc', started_at: now - PROCESSING_GIVE_UP_MS - 1 }), now, true),
		'unknown'
	);
	assert.equal(staleOutcome(t({ status: 'failed', started_at: now - PROCESSING_GIVE_UP_MS - 1 }), now, true), null);
});

const video = [{ id: 'm', post_id: 'p', position: 0, kind: 'video', name: 'a.mp4', size: 1, type: 'video/mp4', duration_ms: 5000 }];
const target = (platform, settings) => ({
	post_id: 'p', platform, status: 'pending', caption: null, settings,
	external_id: null, external_url: null, fail_reason: null, started_at: null, published_at: null, updated_at: 0
});
const view = (media, targets) => ({ id: 'p', caption: 'Hi', status: 'draft', media, targets });
const ytOk = { title: 'T', visibility: 'private', made_for_kids: false };
const ttOk = { privacy: 'PUBLIC_TO_EVERYONE', allow_comment: false, allow_duet: false, allow_stitch: false, brand_organic: false, brand_content: false };

test('readinessError', () => {
	assert.equal(readinessError(view(video, [])), 'Choose at least one platform.');
	assert.equal(
		readinessError(view(video, [target('youtube', { ...ytOk, visibility: null })])),
		'Choose the YouTube visibility.'
	);
	assert.equal(
		readinessError(view(video, [target('tiktok', { ...ttOk, privacy: null })])),
		'TikTok: Choose who can view this video.'
	);
	assert.equal(readinessError(view([], [target('youtube', ytOk)])), 'YouTube needs a video.');
	assert.equal(
		readinessError(view(video, [target('tiktok', ttOk), target('youtube', { ...ytOk, visibility: null })]), {}, ['tiktok']),
		null
	);
});

test('settingsIssue', () => {
	assert.equal(settingsIssue('tiktok', { ...ttOk, privacy: null }, {}), 'Choose who can view this video.');
	assert.equal(
		settingsIssue('tiktok', { ...ttOk, privacy: 'SELF_ONLY', brand_content: true }, {}),
		'Branded content cannot be set to "Only me".'
	);
	assert.equal(
		settingsIssue('tiktok', ttOk, { tiktokPrivacyOptions: ['SELF_ONLY'] }),
		'That privacy option is not available for this account. Choose another one.'
	);
	assert.equal(
		settingsIssue('tiktok', ttOk, { videoSeconds: 700, tiktokMaxSeconds: 600 }),
		'Choose a shorter video for TikTok.'
	);
	assert.equal(settingsIssue('youtube', { ...ytOk, title: '' }, {}), 'Add a YouTube title.');
	assert.equal(
		settingsIssue('youtube', { ...ytOk, title: 'a<b' }, {}),
		'YouTube titles can be up to 100 characters, without < or >.'
	);
	assert.equal(settingsIssue('youtube', ytOk, {}), null);
	assert.equal(settingsIssue('youtube', { ...ytOk, made_for_kids: null }, {}), 'Tell YouTube whether this video is made for kids.');
});

test('parseSettings', () => {
	assert.throws(() => parseSettings('youtube', { title: 'T', visibility: 'nope', made_for_kids: false }));
	const s = parseSettings('tiktok', { privacy: 'SELF_ONLY', allow_comment: 1 });
	assert.equal(s.privacy, 'SELF_ONLY');
	assert.equal(s.allow_comment, true);
	assert.equal(s.allow_duet, false);
	assert.equal(s.brand_content, false);
});

test('defaultSettings', () => {
	assert.equal(defaultSettings('youtube', 'Hello\nworld').title, 'Hello');
	assert.deepEqual(defaultSettings('x', 'a'), {});
	assert.equal(defaultSettings('tiktok', 'a').privacy, null);
});

test('isHttps accepts any letter case of the scheme', async () => {
	const { isHttps } = await import('./targets.ts');
	assert.equal(isHttps('https://x.com/a'), true);
	assert.equal(isHttps('HTTPS://x.com/a'), true);
	assert.equal(isHttps('Https://x.com/a'), true);
	assert.equal(isHttps('http://x.com/a'), false);
	assert.equal(isHttps('javascript:alert(1)'), false);
	assert.equal(isHttps(''), false);
});
