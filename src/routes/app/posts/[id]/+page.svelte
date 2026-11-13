<script lang="ts">
	import { beforeNavigate, goto, invalidateAll } from '$app/navigation';
	import { onDestroy, untrack } from 'svelte';
	import ConfirmDialog from '#lib/ui/ConfirmDialog.svelte';
	import { site } from '#lib';
	import Icon from '#lib/Icon.svelte';
	import {
		LOCKED,
		privacyLabel,
		statusLabel,
		title,
		type Post,
		type Privacy,
	} from '#lib/posts.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	type Target = 'idea' | 'draft' | 'scheduled';
	const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
	const MAX_BYTES = 95 * 1024 * 1024;

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

	// Form state, (re)initialised from the loaded post.
	let post = $state<Post | null>(null);
	let caption = $state('');
	let privacy = $state<Privacy | ''>('');
	let allowComment = $state(false);
	let allowDuet = $state(false);
	let allowStitch = $state(false);
	let disclose = $state(false);
	let yourBrand = $state(false);
	let branded = $state(false);
	let target = $state<Target>('draft');
	let when = $state('');
	let baseline = $state('');
	let initialized = $state(false);
	let leavingAfterSave = false;
	let deleteOpen = $state(false);
	const snapshot = () =>
		JSON.stringify({
			caption,
			privacy,
			allowComment,
			allowDuet,
			allowStitch,
			disclose,
			yourBrand,
			branded,
			target,
			when,
		});

	$effect(() => {
		const p = data.post;
		post = p;
		caption = p?.caption ?? '';
		privacy = p?.privacy ?? ''; // TikTok UX rule: no default privacy
		allowComment = !!p?.allow_comment;
		allowDuet = !!p?.allow_duet;
		allowStitch = !!p?.allow_stitch;
		yourBrand = !!p?.brand_organic;
		branded = !!p?.brand_content;
		disclose = yourBrand || branded;
		target =
			data.initialStatus === 'scheduled'
				? 'scheduled'
				: p && (['idea', 'draft', 'scheduled'] as string[]).includes(p.status)
					? (p.status as Target)
					: ((data.initialStatus as Target | null) ??
						(data.date ? 'scheduled' : 'draft'));
		when = p?.scheduled_at ? toLocal(p.scheduled_at) : defaultTime();
		baseline = untrack(snapshot);
		initialized = true;
	});

	let file = $state<File | null>(null);
	let fileUrl = $state('');
	let duration = $state(0);
	let progress = $state<number | null>(null);
	let busy = $state(false);
	let error = $state('');
	let notice = $state('');

	const dirty = $derived(initialized && (snapshot() !== baseline || !!file));
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
			!locked &&
			!confirm('You have unsaved changes. Leave this post?')
		)
			navigation.cancel();
	});
	onDestroy(() => {
		if (fileUrl) URL.revokeObjectURL(fileUrl);
	});
	const ci = $derived(data.creator);
	const locked = $derived(!!post && LOCKED.includes(post.status));
	const videoSrc = $derived(
		fileUrl || (post?.video_key ? `/api/posts/${post.id}/video` : ''),
	);
	const hasVideo = $derived(!!file || !!post?.video_key);
	const tooLong = $derived(!!ci && duration > ci.max_video_post_duration_sec);
	const brandedPrivate = $derived(
		disclose && branded && privacy === 'SELF_ONLY',
	);
	const disclosureIncomplete = $derived(disclose && !yourBrand && !branded);
	const readyToPost = $derived(
		!!ci &&
			hasVideo &&
			!!privacy &&
			!tooLong &&
			!brandedPrivate &&
			!disclosureIncomplete,
	);
	const scheduleInPast = $derived(
		target === 'scheduled' && new Date(when).getTime() < Date.now(),
	);

	function pick(e: Event) {
		selectFile((e.currentTarget as HTMLInputElement).files?.[0]);
	}
	function selectFile(f: File | undefined) {
		if (!f || busy) return;
		error = '';
		if (!VIDEO_TYPES.includes(f.type))
			return void (error = 'Use an MP4, MOV or WebM video.');
		if (f.size > MAX_BYTES) return void (error = 'Video must be under 95MB.');
		if (fileUrl) URL.revokeObjectURL(fileUrl);
		duration = 0;
		file = f;
		fileUrl = URL.createObjectURL(f);
	}

	async function api(
		path: string,
		method: string,
		body?: unknown,
	): Promise<Post> {
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
		return new Promise<Post>((resolve, reject) => {
			const x = new XMLHttpRequest();
			x.open('PUT', `/api/posts/${id}/video`);
			x.setRequestHeader('content-type', f.type);
			x.setRequestHeader('x-file-name', encodeURIComponent(f.name));
			x.upload.onprogress = (e) =>
				(progress = e.lengthComputable ? e.loaded / e.total : null);
			x.onload = () => {
				progress = null;
				try {
					const json = JSON.parse(x.responseText || '{}');
					x.status >= 200 && x.status < 300
						? resolve(json)
						: reject(new Error(json.message ?? 'Upload failed'));
				} catch {
					reject(new Error('Upload failed. Please try again.'));
				}
			};
			x.onerror = () => (
				(progress = null),
				reject(new Error('Upload failed. Check your connection.'))
			);
			x.send(f);
		});
	}

	/** Saves fields → uploads video → applies final status → optionally publishes now. */
	async function save(status: Target, publishNow = false) {
		if (busy) return;
		busy = true;
		error = notice = '';
		try {
			const fields = {
				caption,
				privacy: privacy || null,
				allow_comment: allowComment,
				allow_duet: allowDuet,
				allow_stitch: allowStitch,
				brand_organic: disclose && yourBrand,
				brand_content: disclose && branded,
				scheduled_at: status === 'scheduled' ? new Date(when).getTime() : null,
			};
			// Scheduling validates that a video exists, so upload first and schedule after.
			const first: Target = file && status === 'scheduled' ? 'draft' : status;
			let p = post
				? await api(`/api/posts/${post.id}`, 'PATCH', {
						...fields,
						status: first,
					})
				: await api('/api/posts', 'POST', { ...fields, status: first });
			post = p;
			if (file) {
				p = await upload(p.id, file);
				post = p;
				file = null;
			}
			if (first !== status)
				p = await api(`/api/posts/${p.id}`, 'PATCH', { status });
			if (publishNow) p = await api(`/api/posts/${p.id}/publish`, 'POST');

			notice = publishNow
				? ''
				: status === 'scheduled'
					? 'Scheduled. It will be published automatically.'
					: 'Saved.';
			post = p;
			baseline = snapshot();
			leavingAfterSave = true;
			if (data.post?.id !== p.id || data.initialStatus === 'scheduled')
				await goto(`/app/posts/${p.id}?from=${data.from ?? 'board'}`, {
					replace: true,
				});
			else await invalidateAll();
			leavingAfterSave = false;
		} catch (e) {
			error = (e as Error).message; // Keep local fields and the created ID so retry never loses work.
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

	// While TikTok processes the upload, poll until it's published or failed.
	$effect(() => {
		if (post?.status !== 'publishing') return;
		const id = post.id;
		const t = setInterval(async () => {
			const p = await api(`/api/posts/${id}/sync`, 'POST').catch(() => null);
			if (p && p.status !== 'publishing') invalidateAll();
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
		<p class="editor-subtitle">Your next TikTok, thoughtfully put together.</p>
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
{#if post?.status === 'failed'}
	<p class="alert" role="alert">
		<strong>Publishing failed:</strong>
		{post.fail_reason}
	</p>
{/if}

{#if locked && post}
	<section class="card status">
		{#if post.status === 'publishing'}
			<div class="spinner" aria-hidden="true"></div>
			<div>
				<h2>Publishing to TikTok…</h2>
				<p class="muted">
					TikTok is processing the video. This page updates automatically.
				</p>
			</div>
		{:else}
			<div class="done"><Icon name="check" size={28} /></div>
			<div>
				<h2>Published</h2>
				<p class="muted">
					Posted {post.published_at ? fmt(post.published_at) : ''} as {post.privacy
						? privacyLabel[post.privacy]
						: ''}. The video file was removed from {site.name} storage after publishing.
				</p>
				<p class="caption">{post.caption || 'No caption'}</p>
			</div>
		{/if}
	</section>
{:else}
	{#if data.creatorError}
		<p class="alert info">
			{data.creatorError} You can still save ideas and drafts.
			<a href="/app/settings#tiktok">Go to Account Settings</a>
		</p>
	{/if}

	<form class="editor" onsubmit={(e) => (e.preventDefault(), save(target))}>
		<section
			class="card preview"
			ondragover={(e) => e.preventDefault()}
			ondrop={(e) => {
				e.preventDefault();
				selectFile(e.dataTransfer?.files[0]);
			}}
			aria-label="Video preview"
		>
			{#if videoSrc}
				<!-- svelte-ignore a11y_media_has_caption -->
				<video
					src={videoSrc}
					controls
					onloadedmetadata={(e) => (duration = e.currentTarget.duration)}
				></video>
				<label class="btn sm change">
					<input
						type="file"
						disabled={busy}
						accept={VIDEO_TYPES.join(',')}
						onchange={pick}
						class="sr-only"
					/>
					<Icon name="video" size={16} /> Change video
				</label>
			{:else}
				<label class="drop">
					<input
						type="file"
						disabled={busy}
						accept={VIDEO_TYPES.join(',')}
						onchange={pick}
						class="sr-only"
					/>
					<span class="drop-ico"><Icon name="video" size={26} /></span>
					<strong>A space for your video</strong><span class="muted"
						>Drop it here, or click to browse</span
					>
					<span class="muted"
						>MP4, MOV or WebM · up to 95MB{ci
							? ` · max ${Math.round(ci.max_video_post_duration_sec / 60)} min`
							: ''}</span
					>
				</label>
			{/if}
			{#if progress !== null}
				<div
					class="progress"
					role="progressbar"
					aria-valuenow={Math.round(progress * 100)}
					aria-valuemin="0"
					aria-valuemax="100"
				>
					<span style="width: {progress * 100}%"></span>
				</div>
			{/if}
			{#if tooLong}<p class="err">
					This video is longer than your account allows ({ci?.max_video_post_duration_sec}s).
				</p>{/if}
		</section>

		<section class="card fields">
			<fieldset class="editor-fields" disabled={busy}>
				<div class="section-heading">
					<span class="eyebrow">The details</span>
					<h2>Bring your post to life.</h2>
				</div>
				{#if ci}
					<div class="creator">
						<img class="avatar" src={ci.creator_avatar_url} alt="" />
						<span>
							<small class="muted">Posting to</small>
							<strong>{ci.creator_nickname}</strong>
						</span>
					</div>
				{/if}

				<label class="field">
					Caption
					<textarea
						class="input"
						bind:value={caption}
						maxlength="2200"
						rows="5"
						placeholder="Describe your video #hashtags"
					></textarea>
					<small>{caption.length}/2200</small>
				</label>

				<label class="field">
					Who can view this video
					<select class="input" bind:value={privacy} disabled={!ci}>
						<option value="" disabled>Select privacy</option>
						{#each ci?.privacy_level_options ?? [] as opt (opt)}
							<option
								value={opt}
								disabled={disclose && branded && opt === 'SELF_ONLY'}
								>{privacyLabel[opt]}</option
							>
						{/each}
					</select>
				</label>

				<fieldset>
					<legend>Interactions</legend>
					<label class="check">
						<input
							type="checkbox"
							bind:checked={allowComment}
							disabled={!ci || ci.comment_disabled}
						/>
						Comment
						{#if ci?.comment_disabled}<small class="muted"
								>(off in your TikTok settings)</small
							>{/if}
					</label>
					<label class="check">
						<input
							type="checkbox"
							bind:checked={allowDuet}
							disabled={!ci || ci.duet_disabled}
						/>
						Duet
						{#if ci?.duet_disabled}<small class="muted"
								>(off in your TikTok settings)</small
							>{/if}
					</label>
					<label class="check">
						<input
							type="checkbox"
							bind:checked={allowStitch}
							disabled={!ci || ci.stitch_disabled}
						/>
						Stitch
						{#if ci?.stitch_disabled}<small class="muted"
								>(off in your TikTok settings)</small
							>{/if}
					</label>
				</fieldset>

				<fieldset>
					<label class="check strong"
						><input type="checkbox" bind:checked={disclose} /> Disclose video content</label
					>
					{#if disclose}
						<label class="check"
							><input type="checkbox" bind:checked={yourBrand} /> Your brand</label
						>
						<label class="check"
							><input type="checkbox" bind:checked={branded} /> Branded content</label
						>
						{#if disclosureIncomplete}
							<p class="err">Select at least one option.</p>
						{:else}
							<p class="muted note">
								Your video will be labeled as "{branded
									? 'Paid partnership'
									: 'Promotional content'}".
							</p>
						{/if}
						{#if brandedPrivate}<p class="err">
								Branded content visibility cannot be set to "Only me".
							</p>{/if}
					{/if}
				</fieldset>

				<fieldset>
					<legend>Publishing</legend>
					<div class="seg" role="radiogroup" aria-label="Status">
						{#each [['idea', 'Idea'], ['draft', 'Draft'], ['scheduled', 'Schedule']] as [value, label] (value)}
							<label class:active={target === value}>
								<input
									type="radio"
									bind:group={target}
									{value}
									class="sr-only"
								/>
								{label}
							</label>
						{/each}
					</div>
					{#if target === 'scheduled'}
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

				<p class="legal muted">
					By posting, you agree to TikTok's
					{#if disclose && branded}
						<a
							href="https://www.tiktok.com/legal/page/global/bc-policy/en"
							target="_blank"
							rel="noopener">Branded Content Policy</a
						> and
					{/if}
					<a
						href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en"
						target="_blank"
						rel="noopener">Music Usage Confirmation</a
					>.
				</p>

				<div class="actions">
					<button
						class="btn primary"
						disabled={busy ||
							(target === 'scheduled' && (!readyToPost || scheduleInPast))}
					>
						{busy
							? progress !== null
								? `Uploading ${Math.round(progress * 100)}%`
								: 'Saving…'
							: target === 'scheduled'
								? 'Schedule'
								: `Save ${target}`}
					</button>
					<button
						type="button"
						class="btn dark"
						disabled={busy || !readyToPost}
						onclick={() => save('draft', true)}
					>
						<Icon name="send" size={16} /> Post now
					</button>
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
				{#if target === 'scheduled' && !readyToPost && ci}
					<p class="muted note">
						{!hasVideo
							? 'Add a video to schedule this post.'
							: !privacy
								? 'Choose who can view this video.'
								: tooLong
									? 'Choose a shorter video before scheduling.'
									: brandedPrivate
										? 'Choose a different privacy level for branded content.'
										: 'Complete your content disclosure choices.'}
					</p>
				{/if}
			</fieldset>
		</section>
	</form>
{/if}

<ConfirmDialog
	bind:open={deleteOpen}
	title="Delete this post?"
	description="This removes the post and its stored video from your workspace. This cannot be undone."
	onconfirm={remove}
/>

<style>
	.head {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		gap: 16px;
		margin-bottom: 16px;
	}
	.back {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		color: var(--muted);
		text-decoration: none;
		font-size: 14px;
	}
	h1 {
		margin: 4px 0 0;
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
		top: 16px;
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 14px;
	}
	video,
	.drop {
		width: 100%;
		aspect-ratio: 9 / 16;
		border-radius: var(--radius);
		background: #000;
	}
	.drop {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 16px;
		text-align: center;
		background: var(--tile);
		border: 2px dashed var(--line-strong);
		cursor: pointer;
		font-size: 13px;
	}
	.drop:hover,
	.drop:focus-within {
		border-color: var(--primary);
	}
	.drop-ico {
		display: grid;
		place-items: center;
		width: 56px;
		height: 56px;
		border-radius: 50%;
		background: var(--primary);
		color: #fff;
	}
	.drop strong {
		font-size: 15px;
	}
	.change {
		align-self: center;
	}
	.progress {
		height: 8px;
		border-radius: 999px;
		background: var(--primary-soft);
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
	}
	.creator {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.creator small {
		display: block;
		font-size: 12px;
	}
	fieldset {
		margin: 0;
		border: 1px solid var(--line);
		border-radius: var(--radius);
		padding: 12px 14px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	legend {
		font-weight: 600;
		font-size: 13px;
		padding: 0 4px;
	}
	.check.strong {
		font-weight: 600;
	}
	.seg {
		display: inline-flex;
		align-self: flex-start;
		padding: 4px;
		border-radius: 999px;
		background: var(--tile);
	}
	.seg label {
		padding: 8px 16px;
		border-radius: 999px;
		font-weight: 600;
		font-size: 14px;
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
	.legal {
		margin: 0;
		font-size: 13px;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
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
	.status h2 {
		margin: 0 0 6px;
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

	@media (max-width: 860px) {
		.editor {
			grid-template-columns: 1fr;
		}
		.preview {
			position: static;
			max-width: 320px;
			margin: 0 auto;
			width: 100%;
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
		border: 0;
		padding: 0;
		gap: 20px;
	}
	.section-heading h2 {
		font-size: 22px;
		margin: 6px 0 0;
	}
	.preview {
		background: #ffffff75;
		top: 24px;
	}
	.drop {
		background: linear-gradient(145deg, #eef1e8, #e7eddf);
		border: 1px dashed #a6b49c80;
	}
	.drop-ico {
		background: #ffffffa6;
		color: #77916c;
		box-shadow: 0 8px 24px #657d5b0d;
	}
	.drop strong {
		font-weight: 500;
		font-size: 14px;
	}
	.drop .muted {
		font-size: 11px;
	}
	.seg label {
		font-size: 12px;
		padding: 8px 14px;
	}
	.seg {
		background: #edf0e8;
	}
	.fields {
		padding: 28px;
	}
	.fields fieldset:not(.editor-fields) {
		border-color: var(--line);
		background: #f7f8f455;
	}
	.actions {
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
	.legal {
		font-size: 10px;
		line-height: 1.8;
	}
	.back {
		font-size: 11px;
	}
	.head h1 {
		font-size: 28px;
		margin-top: 9px;
	}
	.head {
		align-items: center;
		margin-bottom: 26px;
	}
	.progress {
		background: #e1e9dc;
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
			max-width: none;
			display: grid;
			grid-template-columns: minmax(0, 160px) minmax(0, 1fr);
			align-items: center;
		}
		.drop {
			aspect-ratio: auto;
			min-height: 160px;
			grid-column: 1/-1;
		}
		.preview video {
			max-height: 220px;
			object-fit: contain;
		}
		.preview .change {
			justify-self: center;
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
