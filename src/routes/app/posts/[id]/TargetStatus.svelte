<script lang="ts">
	import { platformLabel, type Platform } from '#lib/platforms.ts';
	import type { PostView } from '#lib/posts.ts';
	import type { TargetStatus } from '#lib/targets.ts';

	let {
		post,
		onretry,
		onresolve,
		disabled = false,
	}: {
		post: PostView;
		onretry: (platforms?: Platform[]) => void;
		onresolve: (platform: Platform, outcome: 'published' | 'retry', url?: string) => void;
		disabled?: boolean;
	} = $props();

	const BADGE: Record<TargetStatus, [string, string]> = {
		pending: ['draft', 'Waiting'],
		publishing: ['publishing', 'Publishing'],
		published: ['published', 'Published'],
		failed: ['failed', 'Failed'],
		unknown: ['publishing', 'Needs checking'],
	};
	// Retry only works once nothing is still in flight.
	const canRetry = $derived(post.status === 'failed');
	const failed = $derived(post.targets.filter((t) => t.status === 'failed'));
	let urls = $state<Partial<Record<Platform, string>>>({});
</script>

<ul class="targets">
	{#each post.targets as t (t.platform)}
		{@const label = platformLabel[t.platform]}
		<li>
			<div class="row">
				<strong>{label}</strong>
				<span class="pill {BADGE[t.status][0]}">{BADGE[t.status][1]}</span>
				{#if t.external_url}
					<a href={t.external_url} target="_blank" rel="noopener"
						>View on {label}</a
					>
				{/if}
			</div>
			{#if t.status === 'failed'}
				{#if t.fail_reason}<p class="reason">{t.fail_reason}</p>{/if}
				{#if canRetry}
					<div class="row">
						<button
							type="button"
							class="btn sm"
							{disabled}
							onclick={() => onretry([t.platform])}>Retry</button
						>
					</div>
				{/if}
			{:else if t.status === 'unknown'}
				<p class="reason">
					We couldn't confirm whether this was posted to {label}. Check {label} first.
				</p>
				<div class="row">
					<input
						class="input sm"
						type="url"
						placeholder="Link to the post (optional)"
						aria-label="Link to the {label} post (optional)"
						bind:value={urls[t.platform]}
						{disabled}
					/>
					<button
						type="button"
						class="btn sm"
						{disabled}
						onclick={() =>
							onresolve(t.platform, 'published', urls[t.platform]?.trim() || undefined)}
						>It's posted</button
					>
					<button
						type="button"
						class="btn sm"
						{disabled}
						onclick={() => onresolve(t.platform, 'retry')}
						>Not posted — try again</button
					>
				</div>
			{/if}
		</li>
	{/each}
</ul>
{#if canRetry && failed.length > 1}
	<button
		type="button"
		class="btn sm primary"
		{disabled}
		onclick={() => onretry()}>Retry all failed</button
	>
{/if}

<style>
	.targets {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	li {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 10px 12px;
		border: 1px solid var(--line);
		border-radius: 12px;
		background: #ffffff80;
	}
	.row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
		font-size: 13px;
	}
	.reason {
		margin: 0;
		font-size: 13px;
		color: var(--muted);
	}
	.input.sm {
		flex: 1 1 200px;
		width: auto;
		padding: 7px 10px;
		font-size: 13px;
	}
</style>
