<script lang="ts">
	import type { YouTubeSettings } from '#lib/targets.ts';

	let {
		settings = $bindable(),
		disabled = false,
	}: { settings: YouTubeSettings; disabled?: boolean } = $props();

	const VISIBILITY = [
		['public', 'Public'],
		['unlisted', 'Unlisted'],
		['private', 'Private'],
	] as const;
	const KIDS = [
		[true, "Yes, it's made for kids"],
		[false, "No, it's not made for kids"],
	] as const;
</script>

<fieldset class="youtube" {disabled}>
	<label class="field">
		Title
		<input
			class="input"
			bind:value={settings.title}
			maxlength="100"
			placeholder="What is this video about?"
		/>
		<small>{settings.title.length}/100</small>
	</label>

	<fieldset>
		<legend>Visibility</legend>
		{#each VISIBILITY as [value, label] (value)}
			<label class="check">
				<input type="radio" name="yt-visibility" bind:group={settings.visibility} {value} />
				{label}
			</label>
		{/each}
	</fieldset>

	<fieldset>
		<legend>Made for kids</legend>
		{#each KIDS as [value, label] (label)}
			<label class="check">
				<input type="radio" name="yt-kids" bind:group={settings.made_for_kids} {value} />
				{label}
			</label>
		{/each}
		<p class="muted note">
			YouTube requires this for every video, to follow children's privacy laws.
		</p>
	</fieldset>
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
	fieldset.youtube {
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
	.note {
		margin: 0;
		font-size: 13px;
	}
</style>
