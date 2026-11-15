<script lang="ts" module>
	import { SvelteMap } from 'svelte/reactivity';

	export const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
	export const IMAGE_TYPES = ['image/jpeg', 'image/png'];
	const MAX_VIDEO = 95 * 1024 * 1024;
	const MAX_IMAGE = 8 * 1024 * 1024;
	export const MAX_IMAGES = 35;

	/** Video length in seconds, read from the preview player; keyed by pending File or stored media id. */
	export const durations = new SvelteMap<File | string, number>();
</script>

<script lang="ts">
	import Icon from '#lib/Icon.svelte';
	import type { Media } from '#lib/posts.ts';

	let {
		media,
		pending = $bindable(),
		locked = false,
		postId,
		onremove,
		onreorder,
	}: {
		media: Media[];
		pending: File[];
		locked?: boolean;
		postId: string | null;
		onremove: (id: string) => void;
		onreorder: (ids: string[]) => void;
	} = $props();

	let error = $state('');
	const isVideo = (f: File) => VIDEO_TYPES.includes(f.type);

	// A pending video replaces the stored one on save.
	const pendingVideo = $derived(pending.find(isVideo) ?? null);
	const savedVideo = $derived(
		pendingVideo ? null : (media.find((m) => m.kind === 'video') ?? null),
	);
	const savedImages = $derived(media.filter((m) => m.kind === 'image'));
	const pendingImages = $derived(pending.filter((f) => !isVideo(f)));

	const urls = $derived(new Map(pending.map((f) => [f, URL.createObjectURL(f)])));
	$effect(() => {
		const u = urls;
		return () => u.forEach((url) => URL.revokeObjectURL(url));
	});
	const src = (m: Media) => `/api/posts/${postId}/media/${m.id}`;

	function add(files: FileList | File[] | null | undefined) {
		if (!files?.length || locked) return;
		error = '';
		const list = [...files];
		const videos = list.filter(isVideo);
		const images = list.filter((f) => IMAGE_TYPES.includes(f.type));
		if (videos.length + images.length !== list.length)
			return void (error = 'Use an MP4, MOV or WebM video, or JPEG or PNG images.');
		if (videos.length && images.length)
			return void (error = 'A post can have one video or up to 35 images, not both.');
		if (videos.length) {
			if (videos.length > 1) return void (error = 'A post can have one video.');
			if (savedImages.length || pendingImages.length)
				return void (error = 'Remove the images first: a post can have one video or up to 35 images, not both.');
			if (videos[0].size > MAX_VIDEO) return void (error = 'Video must be under 95MB.');
			pending = [videos[0]];
			return;
		}
		if (savedVideo || pendingVideo)
			return void (error = 'Remove the video first: a post can have one video or up to 35 images, not both.');
		if (images.some((f) => f.size > MAX_IMAGE)) return void (error = 'Images must be under 8MB each.');
		if (savedImages.length + pendingImages.length + images.length > MAX_IMAGES)
			return void (error = `A post can have up to ${MAX_IMAGES} images.`);
		pending = [...pending, ...images];
	}

	function dropPending(f: File) {
		pending = pending.filter((x) => x !== f);
		durations.delete(f);
	}
	function movePending(i: number, by: number) {
		const next = [...pendingImages];
		[next[i], next[i + by]] = [next[i + by], next[i]];
		pending = next;
	}
	function moveSaved(i: number, by: number) {
		const ids = savedImages.map((m) => m.id);
		[ids[i], ids[i + by]] = [ids[i + by], ids[i]];
		onreorder(ids);
	}
	const accept = $derived(
		savedVideo || pendingVideo
			? VIDEO_TYPES.join(',')
			: savedImages.length || pendingImages.length
				? IMAGE_TYPES.join(',')
				: [...VIDEO_TYPES, ...IMAGE_TYPES].join(','),
	);
	const canAddImages = $derived(
		!savedVideo && !pendingVideo && savedImages.length + pendingImages.length < MAX_IMAGES,
	);
</script>

<div
	class="media"
	role="group"
	aria-label="Media"
	ondragover={(e) => e.preventDefault()}
	ondrop={(e) => {
		e.preventDefault();
		add(e.dataTransfer?.files);
	}}
>
	{#if pendingVideo || savedVideo}
		{@const key = pendingVideo ?? savedVideo!.id}
		<!-- svelte-ignore a11y_media_has_caption -->
		<video
			src={pendingVideo ? urls.get(pendingVideo) : src(savedVideo!)}
			controls
			preload="metadata"
			onloadedmetadata={(e) => {
				const d = e.currentTarget.duration;
				if (Number.isFinite(d)) durations.set(key, d);
			}}
		></video>
		{#if !locked}
			<div class="row">
				<label class="btn sm">
					<input
						type="file"
						accept={VIDEO_TYPES.join(',')}
						onchange={(e) => add(e.currentTarget.files)}
						class="sr-only"
					/>
					<Icon name="video" size={16} /> Change video
				</label>
				<button
					type="button"
					class="btn sm danger"
					onclick={() =>
						pendingVideo ? dropPending(pendingVideo) : onremove(savedVideo!.id)}
					><Icon name="trash" size={16} /> Remove</button
				>
			</div>
		{/if}
	{:else if savedImages.length || pendingImages.length}
		<ul class="grid">
			{#each savedImages as m, i (m.id)}
				<li>
					<img src={src(m)} alt={m.name} />
					{#if !locked}
						<div class="tools">
							<button type="button" class="icon-btn" aria-label="Move {m.name} earlier" disabled={i === 0} onclick={() => moveSaved(i, -1)}><Icon name="left" size={14} /></button>
							<button type="button" class="icon-btn" aria-label="Move {m.name} later" disabled={i === savedImages.length - 1} onclick={() => moveSaved(i, 1)}><Icon name="right" size={14} /></button>
							<button type="button" class="icon-btn" aria-label="Remove {m.name}" onclick={() => onremove(m.id)}><Icon name="trash" size={14} /></button>
						</div>
					{/if}
				</li>
			{/each}
			{#each pendingImages as f, i (f)}
				<li class="new">
					<img src={urls.get(f)} alt={f.name} />
					<span class="tag">Not uploaded yet</span>
					{#if !locked}
						<div class="tools">
							<button type="button" class="icon-btn" aria-label="Move {f.name} earlier" disabled={i === 0} onclick={() => movePending(i, -1)}><Icon name="left" size={14} /></button>
							<button type="button" class="icon-btn" aria-label="Move {f.name} later" disabled={i === pendingImages.length - 1} onclick={() => movePending(i, 1)}><Icon name="right" size={14} /></button>
							<button type="button" class="icon-btn" aria-label="Remove {f.name}" onclick={() => dropPending(f)}><Icon name="trash" size={14} /></button>
						</div>
					{/if}
				</li>
			{/each}
		</ul>
		<p class="muted count">{savedImages.length + pendingImages.length} of {MAX_IMAGES} images</p>
		{#if !locked && canAddImages}
			<label class="btn sm">
				<input
					type="file"
					multiple
					accept={IMAGE_TYPES.join(',')}
					onchange={(e) => add(e.currentTarget.files)}
					class="sr-only"
				/>
				<Icon name="plus" size={16} /> Add images
			</label>
		{/if}
	{:else}
		<label class="drop" class:disabled={locked}>
			<input
				type="file"
				multiple
				disabled={locked}
				{accept}
				onchange={(e) => add(e.currentTarget.files)}
				class="sr-only"
			/>
			<span class="drop-ico"><Icon name="video" size={26} /></span>
			<strong>A space for your video or images</strong><span class="muted"
				>Drop it here, or click to browse</span
			>
			<span class="muted">One video: MP4, MOV or WebM · up to 95MB</span>
			<span class="muted">Or up to 35 images: JPEG or PNG · up to 8MB each</span>
		</label>
	{/if}
	{#if error}<p class="err" role="alert">{error}</p>{/if}
</div>

<style>
	.media {
		display: flex;
		flex-direction: column;
		gap: 10px;
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
		background: linear-gradient(145deg, #eef1e8, #e7eddf);
		border: 1px dashed #a6b49c80;
		cursor: pointer;
		font-size: 13px;
	}
	.drop.disabled {
		cursor: not-allowed;
		opacity: 0.6;
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
	.row {
		display: flex;
		justify-content: center;
		gap: 8px;
		flex-wrap: wrap;
	}
	.grid {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
		gap: 8px;
	}
	.grid li {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.grid img {
		width: 100%;
		aspect-ratio: 1;
		object-fit: cover;
		border-radius: 10px;
		background: var(--tile);
	}
	.grid li.new img {
		outline: 2px dashed var(--line-strong);
		outline-offset: -2px;
	}
	.tag {
		position: absolute;
		top: 4px;
		left: 4px;
		padding: 1px 6px;
		border-radius: 6px;
		background: #ffffffd9;
		font-size: 9px;
	}
	.tools {
		display: flex;
		justify-content: space-between;
	}
	.tools .icon-btn {
		width: 26px;
		height: 26px;
		border-radius: 8px;
	}
	.tools .icon-btn:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}
	.count {
		margin: 0;
		font-size: 11px;
	}
	label.btn {
		align-self: center;
	}
	.err {
		margin: 0;
		font-size: 13px;
		color: var(--danger);
	}
</style>
