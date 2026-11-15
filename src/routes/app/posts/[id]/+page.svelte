<script lang="ts">
	import { beforeNavigate, goto, invalidateAll } from '$app/navigation';
	import { untrack } from 'svelte';
	import ConfirmDialog from '#lib/ui/ConfirmDialog.svelte';
	import { site } from '#lib';
	import Icon from '#lib/Icon.svelte';
	import {
		CAPS,
		PLATFORMS,
		contentKind,
		defaultYouTubeTitle,
		effectiveCaption,
		platformIssue,
		platformLabel,
		type Platform,
	} from '#lib/platforms.ts';
	import { statusLabel, title, type PostView } from '#lib/posts.ts';
	import {
		defaultSettings,
		editRules,
		settingsIssue,
		type TargetSettings,
		type TikTokSettings,
		type YouTubeSettings,
	} from '#lib/targets.ts';
	import MediaPicker, { durations, VIDEO_TYPES } from './MediaPicker.svelte';
	import PlatformPicker from './PlatformPicker.svelte';
	import TikTokPanel from './TikTokPanel.svelte';
	import YouTubePanel from './YouTubePanel.svelte';
	import TargetStatus from './TargetStatus.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	type Next = 'idea' | 'draft' | 'scheduled';
	const MAX_CAPTION = 5000; // the largest platform limit; each platform panel shows its own

	const pad = (n: number) => String(n).padStart(2, '0');
	const toLocal = (ms: number) => {
		const d = new Date(ms);
		return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
	};
	const defaultTime = () => {
		if (data.date && new Date(`${data.date}T09:00`).getTime() > Date.now())
			return `${data.date}T09:00`;
		const d = new Date(Date.now() + 3_600_000);
		d.setMinutes(0, 0, 0);
		return toLocal(d.getTime());
	};
	const noOverrides = (): Record<Platform, string | null> => ({
		tiktok: null,
		youtube: null,
		instagram: null,
		threads: null,
		x: null,
	});

	// Form state, (re)initialised from the loaded post.
	let post = $state<PostView | null>(null);
	let caption = $state('');
	let selected = $state<Platform[]>([]);
	let tiktok = $state<TikTokSettings>(
		defaultSettings('tiktok', '') as TikTokSettings,
	);
	let youtube = $state<YouTubeSettings>(
		defaultSettings('youtube', '') as YouTubeSettings,
	);
	let overrides = $state(noOverrides());
	let tiktokIssue = $state<string | null>(null);
	let nextStatus = $state<Next>('draft');
	let when = $state('');
	let baseline = $state('');
	let initialized = $state(false);
	let leavingAfterSave = false;
	let deleteOpen = $state(false);
	/** The YouTube title we filled in from the caption; it keeps following the caption until edited. */
	let ytAutoTitle = '';
	const snapshot = () =>
		JSON.stringify({
			caption,
			selected,
			tiktok,
			youtube,
			overrides,
			nextStatus,
			when,
		});

	function init(p: PostView | null) {
		untrack(() => {
			post = p;
			caption = p?.caption ?? '';
			const target = (pl: Platform) => p?.targets.find((t) => t.platform === pl);
			// A new post starts with every connected platform that is available.
			selected = p
				? PLATFORMS.filter((pl) => target(pl))
				: PLATFORMS.filter((pl) => CAPS[pl].available && !!data.connections[pl]);
			overrides = noOverrides();
			for (const t of p?.targets ?? []) overrides[t.platform] = t.caption;
			tiktok = {
				...((target('tiktok')?.settings as TikTokSettings | undefined) ??
					(defaultSettings('tiktok', caption) as TikTokSettings)),
			};
			ytAutoTitle = defaultYouTubeTitle(effectiveCaption(caption, overrides.youtube));
			youtube = {
				...((target('youtube')?.settings as YouTubeSettings | undefined) ??
					(defaultSettings('youtube', ytAutoTitle) as YouTubeSettings)),
			};
			nextStatus =
				data.initialStatus === 'scheduled'
					? 'scheduled'
					: p && (['idea', 'draft', 'scheduled'] as string[]).includes(p.status)
						? (p.status as Next)
						: ((data.initialStatus as Next | null) ??
							(data.date ? 'scheduled' : 'draft'));
			when = p?.scheduled_at ? toLocal(p.scheduled_at) : defaultTime();
			baseline = snapshot();
			initialized = true;
		});
	}
	// Server render starts from the loaded post too; later loads (after saving) re-initialise.
	untrack(() => init(data.post));
	$effect(() => init(data.post));

	// Until the YouTube title is edited, it follows the first line of the caption.
	$effect(() => {
		const next = defaultYouTubeTitle(effectiveCaption(caption, overrides.youtube));
		untrack(() => {
			if (youtube.title === ytAutoTitle) youtube.title = next;
			ytAutoTitle = next;
		});
	});

	let pending = $state<File[]>([]);
	let progress = $state<{ index: number; total: number; fraction: number | null } | null>(null);
	let busy = $state(false);
	let error = $state('');
	let notice = $state('');

	const dirty = $derived(
		initialized && (snapshot() !== baseline || pending.length > 0),
	);
	const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
	const origin = $derived(
		data.from === 'calendar'
			? '/app/calendar'
			: data.from === 'overview'
				? '/app'
				: data.from === 'posts'
					? '/app/posts'
					: '/app/kanban',
	);
	const backLabel = $derived(
		data.from === 'calendar'
			? 'Calendar'
			: data.from === 'overview'
				? 'Overview'
				: data.from === 'posts'
					? 'All posts'
					: 'Board',
	);
	beforeNavigate((navigation) => {
		if (
			!leavingAfterSave &&
			dirty &&
			!frozen &&
			!confirm('You have unsaved changes. Leave this post?')
		)
			navigation.cancel();
	});

	const rules = $derived(post ? editRules(post, post.targets) : null);
	const frozen = $derived(!!rules?.frozen);
	const contentLocked = $derived(!!rules?.contentLocked);
	const targetOf = (p: Platform) => post?.targets.find((t) => t.platform === p);
	/** Under the content lock only platforms that failed can still change. */
	const panelLocked = (p: Platform) =>
		busy || (contentLocked && targetOf(p)?.status !== 'failed');
	const showTargets = $derived(
		!!post && post.targets.some((t) => t.status !== 'pending'),
	);

	// What the post will contain once pending files are uploaded.
	const pendingVideo = $derived(
		pending.find((f) => VIDEO_TYPES.includes(f.type)) ?? null,
	);
	const media = $derived<{ kind: 'image' | 'video' }[]>(
		pendingVideo
			? [{ kind: 'video' }]
			: [
					...(post?.media ?? []).map((m) => ({ kind: m.kind })),
					...pending.map(() => ({ kind: 'image' as const })),
				],
	);
	const kind = $derived(contentKind(media));
	const imageCount = $derived(media.filter((m) => m.kind === 'image').length);
	const videoSeconds = $derived.by(() => {
		if (pendingVideo) return durations.get(pendingVideo) ?? null;
		const saved = post?.media.find((m) => m.kind === 'video');
		if (!saved) return null;
		return saved.duration_ms != null
			? saved.duration_ms / 1000
			: (durations.get(saved.id) ?? null);
	});

	const settingsFor = (p: Platform): TargetSettings =>
		p === 'tiktok' ? tiktok : p === 'youtube' ? youtube : {};
	const captionFor = (p: Platform) => effectiveCaption(caption, overrides[p]);
	const captionTooLong = (p: Platform) =>
		captionFor(p).length > CAPS[p].maxCaption;

	/** The first problem that stops this platform from posting, or null. */
	function issueFor(p: Platform): string | null {
		const label = platformLabel[p];
		const msg = !data.connections[p]
			? `Connect ${label} in Settings first.`
			: p === 'tiktok' && !data.creator
				? (data.creatorError ?? 'Reconnect TikTok in Settings.')
				: (platformIssue(p, { media, caption: captionFor(p) }) ??
					settingsIssue(p, settingsFor(p), {
						tiktokPrivacyOptions: data.creator?.privacy_level_options,
						videoSeconds,
						tiktokMaxSeconds: data.creator?.max_video_post_duration_sec,
					}) ??
					(p === 'tiktok' ? tiktokIssue : null));
		if (!msg) return null;
		return msg.includes(label) ? msg : `${label}: ${msg}`;
	}
	const firstIssue = $derived.by(() => {
		if (!selected.length) return 'Choose at least one platform.';
		for (const p of selected) {
			const msg = issueFor(p);
			if (msg) return msg;
		}
		return null;
	});
	const readyToPost = $derived(!firstIssue);
	/** Failed platforms whose current settings would fail again; their Retry stays off until fixed. */
	const blocked = $derived.by(() => {
		const out: Partial<Record<Platform, string>> = {};
		for (const t of post?.targets ?? []) {
			if (t.status !== 'failed') continue;
			const msg = issueFor(t.platform);
			if (msg) out[t.platform] = msg;
		}
		return out;
	});
	const scheduleInPast = $derived(
		nextStatus === 'scheduled' && new Date(when).getTime() < Date.now(),
	);

	function toggleOverride(p: Platform, on: boolean) {
		overrides[p] = on ? caption : null;
	}

	async function api(
		path: string,
		method: string,
		body?: unknown,
	): Promise<PostView> {
		const res = await fetch(path, {
			method,
			headers: body ? { 'content-type': 'application/json' } : undefined,
			body: body ? JSON.stringify(body) : undefined,
		});
		const json: any = await res.json().catch(() => ({}));
		if (!res.ok) throw new Error(json.message ?? 'Something went wrong');
		return json;
	}

	function upload(id: string, f: File) {
		return new Promise<PostView>((resolve, reject) => {
			const x = new XMLHttpRequest();
			x.open('PUT', `/api/posts/${id}/media`);
			x.setRequestHeader('content-type', f.type);
			x.setRequestHeader('x-file-name', encodeURIComponent(f.name));
			const seconds = durations.get(f);
			if (seconds != null)
				x.setRequestHeader('x-duration-ms', String(Math.round(seconds * 1000)));
			x.upload.onprogress = (e) => {
				if (progress)
					progress.fraction = e.lengthComputable ? e.loaded / e.total : null;
			};
			x.onload = () => {
				try {
					const json = JSON.parse(x.responseText || '{}');
					x.status >= 200 && x.status < 300
						? resolve(json)
						: reject(new Error(json.message ?? 'Upload failed'));
				} catch {
					reject(new Error('Upload failed. Please try again.'));
				}
			};
			x.onerror = () =>
				reject(new Error('Upload failed. Check your connection.'));
			x.send(f);
		});
	}

	const targetsBody = (platforms: Platform[]) =>
		platforms.map((p) => ({
			platform: p,
			caption: overrides[p],
			settings: settingsFor(p),
		}));

	async function finish(p: PostView, message: string) {
		notice = message;
		post = p;
		baseline = snapshot();
		leavingAfterSave = true;
		if (data.post?.id !== p.id || data.initialStatus === 'scheduled')
			await goto(`/app/posts/${p.id}?from=${data.from ?? 'board'}`, {
				replace: true,
			});
		else await invalidateAll();
		leavingAfterSave = false;
	}

	/** Saves fields and platforms → uploads files one by one → applies final status → optionally publishes now. */
	async function save(status: Next, publishNow = false) {
		if (busy) return;
		busy = true;
		error = notice = '';
		try {
			const fields = {
				caption,
				scheduled_at: status === 'scheduled' ? new Date(when).getTime() : null,
				targets: targetsBody(selected),
			};
			// Scheduling checks the media, so upload first and schedule after.
			const first: Next = pending.length && status === 'scheduled' ? 'draft' : status;
			let p = post
				? await api(`/api/posts/${post.id}`, 'PATCH', { ...fields, status: first })
				: await api('/api/posts', 'POST', { ...fields, status: first });
			post = p;
			const queue = [...pending];
			for (const [i, f] of queue.entries()) {
				progress = { index: i + 1, total: queue.length, fraction: 0 };
				p = await upload(p.id, f);
				post = p;
				pending = pending.filter((x) => x !== f);
				durations.delete(f);
			}
			progress = null;
			if (first !== status)
				p = await api(`/api/posts/${p.id}`, 'PATCH', { status });
			if (publishNow) p = await api(`/api/posts/${p.id}/publish`, 'POST');

			await finish(
				p,
				publishNow
					? ''
					: status === 'scheduled'
						? 'Scheduled. It will be published automatically.'
						: 'Saved.',
			);
		} catch (e) {
			error = (e as Error).message; // Keep local fields and the created ID so retry never loses work.
		} finally {
			progress = null;
			busy = false;
		}
	}

	/** Part of the post is published: only platforms that failed can change. */
	async function saveFailedTargets() {
		if (!post) return null;
		const failed = selected.filter((p) => targetOf(p)?.status === 'failed');
		return api(`/api/posts/${post.id}`, 'PATCH', { targets: targetsBody(failed) });
	}

	async function saveChanges() {
		if (busy || !post) return;
		busy = true;
		error = notice = '';
		try {
			const p = await saveFailedTargets();
			if (p) await finish(p, 'Saved.');
		} catch (e) {
			error = (e as Error).message;
		} finally {
			busy = false;
		}
	}

	async function retry(platforms?: Platform[]) {
		if (busy || !post) return;
		error = notice = '';
		// Saving an edit to a post with nothing published puts it back to draft, so retry no longer applies.
		if (dirty && !contentLocked)
			return void (error = 'You have unsaved changes. Save them, then use Post now.');
		busy = true;
		try {
			// Send the latest settings: edits to failed platforms are saved first.
			if (dirty) await saveFailedTargets();
			const p = await api(
				`/api/posts/${post.id}/retry`,
				'POST',
				platforms ? { platforms } : {},
			);
			await finish(p, '');
		} catch (e) {
			error = (e as Error).message;
		} finally {
			busy = false;
		}
	}

	async function resolve(
		platform: Platform,
		outcome: 'published' | 'retry',
		url?: string,
	) {
		if (busy || !post) return;
		busy = true;
		error = notice = '';
		try {
			const p = await api(
				`/api/posts/${post.id}/targets/${platform}/resolve`,
				'POST',
				{ outcome, ...(url ? { url } : {}) },
			);
			await finish(
				p,
				outcome === 'retry'
					? `${platformLabel[platform]} is ready to try again.`
					: `${platformLabel[platform]} marked as posted.`,
			);
		} catch (e) {
			error = (e as Error).message;
		} finally {
			busy = false;
		}
	}

	async function removeMedia(id: string) {
		if (busy || !post) return;
		if (!confirm('Remove this file from the post? This cannot be undone.')) return;
		busy = true;
		error = '';
		try {
			post = await api(`/api/posts/${post.id}/media/${id}`, 'DELETE');
			durations.delete(id);
		} catch (e) {
			error = (e as Error).message;
		} finally {
			busy = false;
		}
	}

	async function reorderMedia(ids: string[]) {
		if (busy || !post) return;
		busy = true;
		error = '';
		try {
			post = await api(`/api/posts/${post.id}/media`, 'PATCH', { order: ids });
		} catch (e) {
			error = (e as Error).message;
		} finally {
			busy = false;
		}
	}

	async function remove() {
		if (!post) return;
		busy = true;
		try {
			await api(`/api/posts/${post.id}`, 'DELETE');
			leavingAfterSave = true;
			await goto(origin);
		} catch (e) {
			error = (e as Error).message;
			busy = false;
		}
	}

	// While platforms process the post, poll until every one is settled.
	$effect(() => {
		if (post?.status !== 'publishing') return;
		const id = post.id;
		const t = setInterval(async () => {
			const p = await api(`/api/posts/${id}/sync`, 'POST').catch(() => null);
			if (!p) return;
			post = p;
			if (p.status !== 'publishing') invalidateAll();
		}, 4000);
		return () => clearInterval(t);
	});

	const fmt = (ms: number) =>
		new Date(ms).toLocaleString(undefined, {
			dateStyle: 'medium',
			timeStyle: 'short',
		});
</script>

<svelte:head>
	<title>{post ? title(post) : 'New post'} – {site.name}</title>
</svelte:head>

<div class="head">
	<div>
		<a href={origin} class="back"><Icon name="left" size={16} /> {backLabel}</a>
		<h1>
			{post
				? title(post)
				: data.initialStatus === 'idea'
					? 'A little idea, a new beginning.'
					: 'Make something worth sharing.'}
		</h1>
		<p class="editor-subtitle">One post, every place it belongs.</p>
	</div>
	<div class="save-state" role="status">
		{#if busy}<span class="save-dot"></span>Saving…{:else if dirty}<span
				class="save-dot unsaved"
			></span>Unsaved changes{:else if post}<Icon name="check" size={13} />All
			changes saved{:else}Not saved yet{/if}{#if post}<span
				class="pill {post.status}">{statusLabel[post.status]}</span
			>{/if}
	</div>
</div>

{#if error}<p class="alert" role="alert">{error}</p>{/if}
{#if notice}<p class="alert ok" role="status">{notice}</p>{/if}

{#if frozen && post}
	<section class="card status">
		{#if post.status === 'publishing'}
			<div class="spinner" aria-hidden="true"></div>
			<div class="status-body">
				<h2>Publishing…</h2>
				<p class="muted">
					Each platform is processing your post. This page updates automatically.
				</p>
				<TargetStatus {post} onretry={retry} onresolve={resolve} disabled={busy} {blocked} />
			</div>
		{:else}
			<div class="done"><Icon name="check" size={28} /></div>
			<div class="status-body">
				<h2>Published</h2>
				<p class="muted">
					Posted {post.published_at ? fmt(post.published_at) : ''}. Media files
					were removed from {site.name} storage after publishing.
				</p>
				<TargetStatus {post} onretry={retry} onresolve={resolve} disabled={busy} {blocked} />
				<p class="caption">{post.caption || 'No caption'}</p>
			</div>
		{/if}
	</section>
{:else}
	{#if post && showTargets}
		<section class="card targets-card">
			<h2>Where it went</h2>
			<TargetStatus {post} onretry={retry} onresolve={resolve} disabled={busy} {blocked} />
		</section>
	{/if}
	{#if contentLocked}
		<p class="alert info">
			Part of this post is already published. To post it somewhere else, create
			a new post and upload the media again.
		</p>
	{/if}

	<form
		class="editor"
		onsubmit={(e) => (
			e.preventDefault(),
			contentLocked ? saveChanges() : save(nextStatus)
		)}
	>
		<section class="card preview" aria-label="Media">
			<MediaPicker
				media={post?.media ?? []}
				bind:pending
				locked={contentLocked || busy}
				postId={post?.id ?? null}
				onremove={removeMedia}
				onreorder={reorderMedia}
			/>
			{#if progress}
				<p class="muted upload-label">
					Uploading {progress.index} of {progress.total}
				</p>
				<div
					class="progress"
					role="progressbar"
					aria-valuenow={Math.round((progress.fraction ?? 0) * 100)}
					aria-valuemin="0"
					aria-valuemax="100"
				>
					<span style="width: {(progress.fraction ?? 0) * 100}%"></span>
				</div>
			{/if}
		</section>

		<section class="card fields">
			<div class="editor-fields">
				<div class="section-heading">
					<span class="eyebrow">The details</span>
					<h2>Bring your post to life.</h2>
				</div>

				<label class="field">
					Caption
					<textarea
						class="input"
						bind:value={caption}
						maxlength={MAX_CAPTION}
						rows="5"
						placeholder="Describe your post #hashtags"
						disabled={busy || contentLocked}
					></textarea>
					<small>{caption.length} characters</small>
				</label>

				<fieldset>
					<legend>Platforms</legend>
					<PlatformPicker
						bind:selected
						connections={data.connections}
						{kind}
						{imageCount}
						locked={busy || contentLocked}
					/>
				</fieldset>

				{#each selected as p (p)}
					{@const label = platformLabel[p]}
					{@const locked = panelLocked(p)}
					<fieldset class="platform">
						<legend>{label}</legend>
						{#if !data.connections[p] && !(contentLocked && locked)}
							<p class="alert info">
								{label} is not connected.
								<a href="/app/settings#connections">Connect in Settings</a>
							</p>
						{/if}
						<label class="check">
							<input
								type="checkbox"
								checked={overrides[p] !== null}
								disabled={locked}
								onchange={(e) => toggleOverride(p, e.currentTarget.checked)}
							/>
							Use a different caption for {label}
						</label>
						{#if overrides[p] !== null}
							<textarea
								class="input"
								aria-label="{label} caption"
								bind:value={() => overrides[p] ?? '', (v) => (overrides[p] = v)}
								maxlength={MAX_CAPTION}
								rows="4"
								disabled={locked}
							></textarea>
						{/if}
						<small class="count" class:err={captionTooLong(p)}
							>{captionFor(p).length}/{CAPS[p].maxCaption}</small
						>
						{#if captionTooLong(p)}
							<p class="err">
								{label} captions can be up to {CAPS[p].maxCaption} characters.
							</p>
						{/if}
						{#if p === 'tiktok'}
							<TikTokPanel
								bind:settings={tiktok}
								bind:issue={tiktokIssue}
								creator={data.creator}
								creatorError={data.creatorError}
								{videoSeconds}
								disabled={locked}
							/>
						{:else if p === 'youtube'}
							<YouTubePanel bind:settings={youtube} disabled={locked} />
						{/if}
					</fieldset>
				{/each}

				<fieldset disabled={busy || contentLocked}>
					<legend>Publishing</legend>
					<div class="seg" role="radiogroup" aria-label="Status">
						{#each [['idea', 'Idea'], ['draft', 'Draft'], ['scheduled', 'Schedule']] as [value, label] (value)}
							<label class:active={nextStatus === value}>
								<input
									type="radio"
									bind:group={nextStatus}
									{value}
									class="sr-only"
								/>
								{label}
							</label>
						{/each}
					</div>
					{#if nextStatus === 'scheduled'}
						<label class="field">
							Publish at · {timezone}
							<input
								class="input"
								type="datetime-local"
								bind:value={when}
								required
							/>
							{#if scheduleInPast}<small class="err">Pick a future time.</small
								>{/if}
						</label>
					{/if}
				</fieldset>

				<div class="actions">
					{#if contentLocked}
						<button class="btn primary" disabled={busy || !dirty}>
							{busy ? 'Saving…' : 'Save changes'}
						</button>
					{:else}
						<button
							class="btn primary"
							disabled={busy ||
								(nextStatus === 'scheduled' && (!readyToPost || scheduleInPast))}
						>
							{busy
								? progress
									? `Uploading ${progress.index}/${progress.total} · ${Math.round((progress.fraction ?? 0) * 100)}%`
									: 'Saving…'
								: nextStatus === 'scheduled'
									? 'Schedule'
									: `Save ${nextStatus}`}
						</button>
						<button
							type="button"
							class="btn dark"
							disabled={busy || !readyToPost}
							onclick={() => save('draft', true)}
						>
							<Icon name="send" size={16} /> Post now
						</button>
					{/if}
					{#if post}
						<button
							type="button"
							class="btn danger"
							disabled={busy}
							onclick={() => (deleteOpen = true)}
							><Icon name="trash" size={16} /> Delete</button
						>
					{/if}
				</div>
				{#if !contentLocked && firstIssue}
					<p class="muted note">{firstIssue}</p>
				{/if}
			</div>
		</section>
	</form>
{/if}

<ConfirmDialog
	bind:open={deleteOpen}
	title="Delete this post?"
	description="This removes the post and its stored media from your workspace. This cannot be undone."
	onconfirm={remove}
/>

<style>
	.head {
		display: flex;
		justify-content: space-between;
		gap: 16px;
		align-items: center;
		margin-bottom: 26px;
	}
	.back {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		color: var(--muted);
		text-decoration: none;
		font-size: 11px;
	}
	h1 {
		margin: 9px 0 0;
		font-size: 28px;
		overflow-wrap: anywhere;
	}
	.alert {
		margin: 0 0 12px;
	}
	.editor {
		display: grid;
		grid-template-columns: 320px minmax(0, 1fr);
		gap: 16px;
		align-items: start;
	}
	.preview {
		position: sticky;
		top: 24px;
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 14px;
		background: #ffffff75;
	}
	.upload-label {
		margin: 0;
		font-size: 12px;
	}
	.progress {
		height: 8px;
		border-radius: 999px;
		background: #e1e9dc;
		overflow: hidden;
	}
	.progress span {
		display: block;
		height: 100%;
		background: var(--primary);
		transition: width 0.2s;
	}
	.fields {
		display: flex;
		flex-direction: column;
		gap: 18px;
		padding: 28px;
	}
	fieldset {
		margin: 0;
		border: 1px solid var(--line);
		border-radius: var(--radius);
		padding: 12px 14px;
		display: flex;
		flex-direction: column;
		gap: 10px;
		background: #f7f8f455;
	}
	legend {
		font-weight: 600;
		font-size: 13px;
		padding: 0 4px;
	}
	.platform .alert {
		margin: 0;
	}
	.count {
		font-size: 12px;
		color: var(--muted);
	}
	.seg {
		display: inline-flex;
		align-self: flex-start;
		padding: 4px;
		border-radius: 999px;
		background: #edf0e8;
	}
	.seg label {
		padding: 8px 14px;
		border-radius: 999px;
		font-weight: 600;
		font-size: 12px;
		cursor: pointer;
	}
	.seg label.active {
		background: #fff;
		color: var(--primary);
		box-shadow: var(--shadow);
	}
	.seg label:focus-within {
		outline: 2px solid var(--primary);
	}
	.note {
		margin: 0;
		font-size: 13px;
	}
	.err {
		margin: 0;
		font-size: 13px;
		color: var(--danger);
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		position: sticky;
		bottom: 16px;
		z-index: 2;
		background: #f9faf6e8;
		border: 1px solid white;
		padding: 12px;
		border-radius: 16px;
		backdrop-filter: blur(16px);
		box-shadow: 0 6px 28px #293b3208;
		margin-top: 4px;
	}
	.actions .danger {
		margin-left: auto;
	}

	.status {
		display: flex;
		gap: 18px;
		align-items: flex-start;
		max-width: 720px;
	}
	.status h2,
	.targets-card h2 {
		margin: 0 0 6px;
	}
	.status-body {
		display: flex;
		flex-direction: column;
		gap: 12px;
		flex: 1;
		min-width: 0;
	}
	.status-body p {
		margin: 0;
	}
	.targets-card {
		display: flex;
		flex-direction: column;
		gap: 10px;
		margin-bottom: 16px;
	}
	.targets-card h2 {
		font-size: 18px;
	}
	.caption {
		white-space: pre-wrap;
		padding: 12px;
		border-radius: var(--radius);
		background: var(--tile);
	}
	.done {
		display: grid;
		place-items: center;
		width: 56px;
		height: 56px;
		flex: none;
		border-radius: 50%;
		background: var(--ok-soft);
		color: var(--ok);
	}
	.spinner {
		width: 44px;
		height: 44px;
		flex: none;
		border-radius: 50%;
		border: 4px solid var(--primary-soft);
		border-top-color: var(--primary);
		animation: spin 0.9s linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	.editor-subtitle {
		margin: 8px 0 0;
		color: var(--muted);
		font-size: 12px;
	}
	.save-state {
		display: flex;
		align-items: center;
		gap: 7px;
		font-size: 10px;
		color: var(--muted);
		flex-wrap: wrap;
		justify-content: flex-end;
	}
	.save-dot {
		width: 5px;
		height: 5px;
		background: #88a377;
		border-radius: 50%;
	}
	.save-dot.unsaved {
		background: #c6ab7a;
	}
	.editor-fields {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}
	.section-heading h2 {
		font-size: 22px;
		margin: 6px 0 0;
	}
	.fields .field textarea {
		min-height: 155px;
	}
	@media (max-width: 1100px) {
		.editor {
			grid-template-columns: 260px minmax(0, 1fr);
		}
		.fields {
			padding: 20px;
		}
		.actions .btn {
			font-size: 11px;
			padding: 10px 12px;
		}
	}
	@media (max-width: 860px) {
		.editor {
			grid-template-columns: 1fr;
		}
		.preview {
			position: static;
			width: 100%;
		}
		.head {
			flex-direction: column;
			align-items: flex-start;
			gap: 12px;
		}
		.save-state {
			justify-content: flex-start;
		}
		.head h1 {
			font-size: 25px;
		}
		.actions {
			bottom: 10px;
		}
		.fields .field textarea {
			min-height: 130px;
		}
	}
</style>
