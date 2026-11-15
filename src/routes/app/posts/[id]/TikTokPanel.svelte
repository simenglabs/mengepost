<script lang="ts">
	import { privacyLabel, type CreatorInfo } from '#lib/posts.ts';
	import type { TikTokSettings } from '#lib/targets.ts';
	import { untrack } from 'svelte';

	let {
		settings = $bindable(),
		creator,
		creatorError,
		videoSeconds,
		disabled = false,
		issue = $bindable(null),
	}: {
		settings: TikTokSettings;
		creator: CreatorInfo | null;
		creatorError: string | null;
		videoSeconds: number | null;
		disabled?: boolean;
		/** Out: a problem only this panel knows about (incomplete disclosure). */
		issue?: string | null;
	} = $props();

	const ci = $derived(creator);
	// UI-only: whether the disclosure options are open. Re-read whenever new settings arrive.
	let disclose = $state(untrack(() => settings.brand_organic || settings.brand_content));
	$effect(() => {
		const s = settings;
		untrack(() => (disclose = s.brand_organic || s.brand_content));
	});
	const tooLong = $derived(
		!!ci && videoSeconds != null && videoSeconds > ci.max_video_post_duration_sec,
	);
	const brandedPrivate = $derived(
		disclose && settings.brand_content && settings.privacy === 'SELF_ONLY',
	);
	const disclosureIncomplete = $derived(
		disclose && !settings.brand_organic && !settings.brand_content,
	);
	$effect(() => {
		issue = disclosureIncomplete ? 'Complete your content disclosure choices.' : null;
	});

	function toggleDisclose() {
		// Closing the disclosure means nothing is disclosed.
		if (!disclose) settings.brand_organic = settings.brand_content = false;
	}
</script>

<fieldset class="tiktok" {disabled}>
	{#if creatorError}
		<p class="alert info">
			{creatorError} You can still save ideas and drafts.
			<a href="/app/settings#tiktok">Go to Account Settings</a>
		</p>
	{/if}
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
		Who can view this video
		<select
			class="input"
			bind:value={
				() => settings.privacy ?? '', (v) => (settings.privacy = v || null)
			}
			disabled={!ci}
		>
			<option value="" disabled>Select privacy</option>
			{#each ci?.privacy_level_options ?? [] as opt (opt)}
				<option
					value={opt}
					disabled={disclose && settings.brand_content && opt === 'SELF_ONLY'}
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
				bind:checked={settings.allow_comment}
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
				bind:checked={settings.allow_duet}
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
				bind:checked={settings.allow_stitch}
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
			><input
				type="checkbox"
				bind:checked={disclose}
				onchange={toggleDisclose}
			/> Disclose video content</label
		>
		{#if disclose}
			<label class="check"
				><input type="checkbox" bind:checked={settings.brand_organic} /> Your brand</label
			>
			<label class="check"
				><input type="checkbox" bind:checked={settings.brand_content} /> Branded content</label
			>
			{#if disclosureIncomplete}
				<p class="err">Select at least one option.</p>
			{:else}
				<p class="muted note">
					Your video will be labeled as "{settings.brand_content
						? 'Paid partnership'
						: 'Promotional content'}".
				</p>
			{/if}
			{#if brandedPrivate}<p class="err">
					Branded content visibility cannot be set to "Only me".
				</p>{/if}
		{/if}
	</fieldset>

	{#if tooLong}<p class="err">
			This video is longer than your account allows ({ci?.max_video_post_duration_sec}s).
		</p>{/if}

	<p class="legal muted">
		By posting, you agree to TikTok's
		{#if disclose && settings.brand_content}
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
</fieldset>

<style>
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
	fieldset.tiktok {
		border: 0;
		padding: 0;
		gap: 16px;
		background: none;
	}
	legend {
		font-weight: 600;
		font-size: 13px;
		padding: 0 4px;
	}
	.alert {
		margin: 0;
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
	.check.strong {
		font-weight: 600;
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
		font-size: 10px;
		line-height: 1.8;
	}
</style>
