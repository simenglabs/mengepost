<script lang="ts">
	import { platformLabel, type Platform } from '#lib/platforms.ts';
	import type { TargetStatus } from '#lib/targets.ts';

	let { platform, status, size = 22 }: { platform: Platform; status?: TargetStatus; size?: number } = $props();
	const mark: Record<Platform, string> = { tiktok: 'Tt', youtube: 'Yt', instagram: 'Ig', threads: 'Th', x: 'X' };
	const statusText: Record<TargetStatus, string> = {
		pending: 'not published yet',
		publishing: 'publishing',
		published: 'published',
		failed: 'failed',
		unknown: 'needs checking'
	};
	const label = $derived(status ? `${platformLabel[platform]}: ${statusText[status]}` : platformLabel[platform]);
</script>

<span class="badge" style:--s="{size}px" title={label} role="img" aria-label={label}
	><span class="mark">{mark[platform]}</span>{#if status}<span class="dot {status}"></span>{/if}</span
>

<style>
	.badge {
		position: relative;
		display: inline-grid;
		place-items: center;
		width: var(--s);
		height: var(--s);
		border-radius: 7px;
		background: var(--tile);
		color: var(--muted);
		flex: none;
	}
	.mark {
		font-size: calc(var(--s) * 0.42);
		font-weight: 700;
		letter-spacing: -0.02em;
		line-height: 1;
	}
	.dot {
		position: absolute;
		right: -2px;
		bottom: -2px;
		width: calc(var(--s) * 0.36);
		height: calc(var(--s) * 0.36);
		border-radius: 50%;
		border: 1.5px solid #fff;
		background: #b3b3b3;
	}
	.dot.publishing {
		background: #d9a431;
	}
	.dot.published {
		background: var(--ok);
	}
	.dot.failed {
		background: var(--danger);
	}
	.dot.unknown {
		background: #e0802b;
	}
</style>
