<script lang="ts">
	import {
		CAPS,
		PLATFORMS,
		platformIssue,
		platformLabel,
		type ContentKind,
		type Platform,
	} from '#lib/platforms.ts';

	let {
		selected = $bindable(),
		connections,
		kind,
		imageCount,
		locked = false,
	}: {
		selected: Platform[];
		connections: Partial<Record<Platform, { display_name: string; avatar_url: string }>>;
		kind: ContentKind;
		imageCount: number;
		locked?: boolean;
	} = $props();

	// Content checks only: captions are checked per platform panel.
	const media = $derived(
		kind === 'video'
			? [{ kind: 'video' as const }]
			: kind === 'image'
				? Array.from({ length: imageCount }, () => ({ kind: 'image' as const }))
				: [],
	);
	const reason = (p: Platform): 'soon' | 'connect' | string | null =>
		!CAPS[p].available
			? 'soon'
			: !connections[p]
				? 'connect'
				: platformIssue(p, { media, caption: '' });

	function toggle(p: Platform, on: boolean) {
		selected = on
			? PLATFORMS.filter((x) => x === p || selected.includes(x))
			: selected.filter((x) => x !== p);
	}
</script>

<div class="platforms" role="group" aria-label="Platforms">
	{#each PLATFORMS as p (p)}
		{@const why = reason(p)}
		{@const on = selected.includes(p)}
		<div class="chip" class:on class:off={!!why}>
			<label>
				<input
					type="checkbox"
					class="sr-only"
					checked={on}
					disabled={locked || (!!why && !on)}
					onchange={(e) => toggle(p, e.currentTarget.checked)}
				/>
				<span class="dot" aria-hidden="true"></span>
				{platformLabel[p]}
			</label>
			{#if why === 'soon'}
				<small class="muted">Coming soon</small>
			{:else if why === 'connect'}
				<a href="/app/settings#connections">Connect in Settings</a>
			{:else if why}
				<small class="why">{why}</small>
			{:else if connections[p]}
				<small class="muted">{connections[p].display_name}</small>
			{/if}
		</div>
	{/each}
</div>

<style>
	.platforms {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}
	.chip {
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 120px;
		padding: 10px 12px;
		border: 1px solid var(--line-strong);
		border-radius: 12px;
		background: #ffffffb3;
		font-size: 13px;
	}
	.chip label {
		display: flex;
		align-items: center;
		gap: 8px;
		font-weight: 600;
		cursor: pointer;
	}
	.chip:focus-within {
		outline: 2px solid var(--primary);
	}
	.chip.on {
		border-color: var(--primary);
		background: var(--primary-soft);
	}
	.chip.off:not(.on) label {
		color: var(--muted);
		cursor: not-allowed;
	}
	.chip:has(input:disabled) label {
		cursor: not-allowed;
	}
	.dot {
		width: 14px;
		height: 14px;
		flex: none;
		border-radius: 4px;
		border: 1.5px solid var(--line-strong);
		background: #fff;
	}
	.chip.on .dot {
		border-color: var(--primary);
		background: var(--primary);
		box-shadow: inset 0 0 0 2px #fff;
	}
	.chip small,
	.chip a {
		font-size: 11px;
	}
	.why {
		color: var(--danger);
	}
</style>
