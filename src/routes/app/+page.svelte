<script lang="ts">
	import { site } from '#lib';
	import Icon from '#lib/Icon.svelte';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import EmptyState from '#lib/ui/EmptyState.svelte';
	import { statusLabel, title } from '#lib/posts.ts';
	import { contentKind } from '#lib/platforms.ts';
	import type { PageProps } from './$types';
	let { data }: PageProps = $props();
	const fmt = (ms: number) =>
		new Date(ms).toLocaleString(undefined, {
			day: 'numeric',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit',
		});
	const max = $derived(Math.max(1, ...data.weeks.map((w) => w.count)));
	const total = $derived(data.weeks.reduce((n, w) => n + w.count, 0));
	const weekLabel = (ms: number) =>
		new Date(ms).toLocaleDateString(undefined, {
			day: 'numeric',
			month: 'short',
		});
	const metrics = $derived([
		{
			label: 'Ideas to explore',
			count: data.stats.ideas,
			status: 'idea',
			icon: 'bulb' as const,
		},
		{
			label: 'Drafts in progress',
			count: data.stats.drafts,
			status: 'draft',
			icon: 'edit' as const,
		},
		{
			label: 'Ready & scheduled',
			count: data.stats.scheduled,
			status: 'scheduled',
			icon: 'calendar' as const,
		},
		{
			label: 'Published this month',
			count: data.stats.publishedMonth,
			status: 'published',
			icon: 'check' as const,
		},
	]);
</script>

<svelte:head><title>Overview – {site.name}</title></svelte:head>
<PageHeader
	title="A little space to create."
	description={`Welcome back, ${data.user.name.split(' ')[0]}. Let's make room for your next idea.`}
	eyebrow="Your creative overview"
/>
<section class="metrics" aria-label="Content overview">
	{#each metrics as m}<a href="/app/posts?status={m.status}" class="metric"
			><div class="metric-top">
				<span>{m.label}</span><span class="metric-icon {m.status}"
					><Icon name={m.icon} size={17} /></span
				>
			</div>
			<strong>{m.count.toString().padStart(2, '0')}</strong><span
				class="metric-bottom"
				>{m.status === 'published'
					? `${data.stats.publishedTotal} published in total`
					: 'View posts'}<Icon name="arrow" size={13} /></span
			></a
		>{/each}
</section>
<div class="overview-grid">
	<section class="card upcoming">
		<div class="card-head">
			<div>
				<span class="eyebrow">On the horizon</span>
				<h2>Your next posts</h2>
			</div>
			<a href="/app/calendar" class="text-link"
				>Calendar<Icon name="right" size={14} /></a
			>
		</div>
		{#each data.upcoming as p}<a
				class="link-row"
				href="/app/posts/{p.id}?from=overview"
				><span class="date-tile"
					><b>{new Date(p.scheduled_at!).getDate()}</b><small
						>{new Date(p.scheduled_at!).toLocaleDateString(undefined, {
							month: 'short',
						})}</small
					></span
				><span class="grow"
					><strong>{title(p)}</strong><small>{fmt(p.scheduled_at!)}</small
					></span
				><span class="pill scheduled">Scheduled</span></a
			>{:else}<EmptyState
				title="A clear calendar. A fresh start."
				description="Give your next idea a little space on the calendar."
				icon="calendar"
				href="/app/calendar"
				action="Plan a post"
			/>{/each}
	</section>
	<section class="inspiration">
		<div class="bloom" aria-hidden="true">
			<span></span><span></span><span></span><span></span><span></span><span
			></span><i></i>
		</div>
		<span class="eyebrow">Small ideas. Good things.</span>
		<h2>Your next great post<br />starts with a thought.</h2>
		<p>Save it now. Shape it when you're ready.</p>
		<a href="/app/posts/new?status=idea" class="btn"
			><Icon name="plus" size={15} />Capture an idea</a
		>
	</section>
	<section class="card activity">
		<div class="card-head">
			<div>
				<span class="eyebrow">Keep things moving</span>
				<h2>Recently worked on</h2>
			</div>
			<a class="text-link" href="/app/posts"
				>All posts<Icon name="right" size={14} /></a
			>
		</div>
		{#each data.recent as p}<a
				class="link-row"
				href="/app/posts/{p.id}?from=overview"
				><span class="post-icon {p.status}"
					><Icon name={contentKind(p.media) === 'video' ? 'video' : 'edit'} size={17} /></span
				><span class="grow"
					><strong>{title(p)}</strong><small>Updated {fmt(p.updated_at)}</small
					></span
				><span class="pill {p.status}">{statusLabel[p.status]}</span></a
			>{:else}<EmptyState
				title="Your story starts here."
				description="Capture an idea or create a draft. Your recent work will appear here."
				icon="edit"
				href="/app/posts/new"
				action="Create your first post"
			/>{/each}
	</section>
	<section class="card chart">
		<div class="card-head">
			<div>
				<span class="eyebrow">A steady creative rhythm</span>
				<h2>Publishing activity</h2>
			</div>
			<span class="period">8 weeks</span>
		</div>
		<div class="chart-summary">
			<strong>{total}</strong><span
				>{total === 1 ? 'post published' : 'posts published'}</span
			>
		</div>
		<div
			class="bars"
			role="img"
			aria-label={data.weeks
				.map((w) => `${weekLabel(w.from)}: ${w.count} posts`)
				.join('; ')}
		>
			{#each data.weeks as w, i}<div class="bar-col">
					<span class="val">{w.count}</span>
					<div class="bar-track">
						<div
							class="bar"
							class:current={i === 7}
							style:height={`${Math.max(3, (w.count / max) * 100)}%`}
						></div>
					</div>
					<span class="lbl">{weekLabel(w.from)}</span>
				</div>{/each}
		</div>
	</section>
</div>
{#if data.attention.length}<section class="card attention">
		<div class="card-head">
			<h2 class="card-title">A little attention needed</h2>
			<span class="pill failed">{data.attention.length}</span>
		</div>
		{#each data.attention as p}<a
				class="link-row"
				href="/app/posts/{p.id}?from=overview"
				><Icon name="alert" size={17} /><span class="grow"
					><strong>{title(p)}</strong><small
						>{p.reason}</small
					></span
				><Icon name="right" size={16} /></a
			>{/each}
	</section>{/if}
{#if Object.keys(data.connections).length === 0}<div class="connect-strip glass">
		<span class="connect-symbol"><Icon name="link" size={20} /></span>
		<div>
			<strong>Your workspace is ready. Bring your accounts along.</strong>
			<p>Connect your accounts to schedule and publish your posts.</p>
		</div>
		<a href="/app/settings#connections" class="btn sm"
			>Connect accounts<Icon name="arrow" size={14} /></a
		>
	</div>{/if}

<style>
	.metrics {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 14px;
		margin-bottom: 24px;
	}
	.metric {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 20px;
		background: #ffffff85;
		border: 1px solid white;
		border-radius: 20px;
		text-decoration: none;
		color: var(--ink);
		transition:
			transform 0.2s,
			background 0.2s;
	}
	.metric:hover {
		background: #fff;
		transform: translateY(-2px);
	}
	.metric-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		color: var(--muted);
		font-size: 11px;
	}
	.metric-icon,
	.post-icon {
		width: 32px;
		height: 32px;
		display: grid;
		place-items: center;
		border-radius: 11px;
		background: var(--tile);
		flex: none;
	}
	.metric-icon.idea,
	.post-icon.idea {
		background: var(--lavender);
		color: #88739c;
	}
	.metric-icon.draft {
		background: var(--peach);
		color: #a58469;
	}
	.metric-icon.scheduled {
		background: var(--sky);
		color: #7591a6;
	}
	.metric-icon.published {
		background: var(--primary-soft);
		color: #77936a;
	}
	.metric > strong {
		font-size: 38px;
		line-height: 1.2;
		letter-spacing: -2px;
		font-weight: 450;
	}
	.metric-bottom {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 10px;
		color: #8b9487;
		margin-top: 4px;
	}
	.overview-grid {
		display: grid;
		grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
		gap: 20px;
	}
	.card-head h2 {
		font-size: 18px;
		margin: 7px 0 0;
	}
	.upcoming .card-head,
	.activity .card-head {
		margin-bottom: 18px;
	}
	.date-tile {
		width: 43px;
		height: 49px;
		border-radius: 12px;
		background: #e9eedf;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		flex: none;
	}
	.date-tile b {
		font-size: 17px;
		line-height: 1.2;
		font-weight: 500;
	}
	.date-tile small {
		font-size: 9px;
	}
	.inspiration {
		position: relative;
		overflow: hidden;
		border-radius: 24px;
		padding: 28px;
		background: linear-gradient(120deg, #e8e8dc, #e4e9dc 50%, #e2e9dd);
		border: 1px solid #f4f5eb;
		min-height: 270px;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		justify-content: flex-end;
	}
	.inspiration h2 {
		font-size: 24px;
		line-height: 1.3;
		margin: 11px 0 8px;
		position: relative;
		z-index: 1;
	}
	.inspiration p {
		font-size: 12px;
		color: #7d8875;
		margin: 0 0 20px;
	}
	.inspiration .btn {
		background: #ffffffa6;
		border-color: white;
		font-size: 11px;
		min-height: 36px;
	}
	.bloom {
		position: absolute;
		right: 45px;
		top: 60px;
		width: 50px;
		height: 50px;
		opacity: 0.65;
		transform: rotate(-15deg);
	}
	.bloom span {
		position: absolute;
		width: 46px;
		height: 90px;
		bottom: 25px;
		left: 2px;
		border-radius: 50%;
		transform-origin: 50% 100%;
		background: linear-gradient(#b8c8a0aa, #cfdbc655);
		border: 1px solid #f8faeeaa;
	}
	.bloom span:nth-child(2) {
		transform: rotate(60deg);
	}
	.bloom span:nth-child(3) {
		transform: rotate(120deg);
	}
	.bloom span:nth-child(4) {
		transform: rotate(180deg);
	}
	.bloom span:nth-child(5) {
		transform: rotate(240deg);
	}
	.bloom span:nth-child(6) {
		transform: rotate(300deg);
	}
	.bloom i {
		position: absolute;
		inset: 3px;
		border-radius: 50%;
		background: #e6eccb;
		box-shadow: 0 0 20px #ffffed88;
	}
	.period {
		font-size: 10px;
		color: var(--muted);
		padding: 5px 9px;
		background: var(--tile);
		border-radius: 8px;
	}
	.chart-summary {
		display: flex;
		align-items: baseline;
		gap: 8px;
		margin-bottom: 10px;
	}
	.chart-summary strong {
		font-weight: 450;
		font-size: 30px;
		letter-spacing: -1px;
	}
	.chart-summary span {
		font-size: 10px;
		color: var(--muted);
	}
	.bars {
		display: grid;
		grid-template-columns: repeat(8, minmax(0, 1fr));
		gap: 10px;
		height: 138px;
	}
	.bar-col {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 5px;
		min-width: 0;
	}
	.val {
		font-size: 9px;
		color: #8a9581;
	}
	.bar-track {
		height: 90px;
		width: 100%;
		max-width: 27px;
		position: relative;
		display: flex;
		align-items: flex-end;
	}
	.bar {
		width: 100%;
		border-radius: 5px;
		background: #dce6d1;
	}
	.bar.current {
		background: #8ca677;
	}
	.lbl {
		font-size: 9px;
		color: var(--muted);
		white-space: nowrap;
	}
	.attention {
		margin-top: 20px;
	}
	.connect-strip {
		display: flex;
		align-items: center;
		gap: 15px;
		margin-top: 24px;
		padding: 18px 22px;
		border-radius: 18px;
	}
	.connect-symbol {
		width: 38px;
		height: 38px;
		display: grid;
		place-items: center;
		background: var(--lavender);
		border-radius: 12px;
		flex: none;
	}
	.connect-strip strong {
		font-size: 12px;
		font-weight: 500;
	}
	.connect-strip p {
		font-size: 11px;
		color: var(--muted);
		margin: 2px 0 0;
	}
	.connect-strip .btn {
		margin-left: auto;
	}
	@media (max-width: 1100px) {
		.metrics {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.overview-grid {
			grid-template-columns: 1fr 1fr;
		}
		.lbl {
			font-size: 8px;
		}
		.bars {
			gap: 6px;
		}
	}
	@media (max-width: 900px) {
		.overview-grid {
			grid-template-columns: 1fr;
		}
		.inspiration {
			min-height: 240px;
		}
		.chart {
			min-height: 285px;
		}
	}
	@media (max-width: 480px) {
		.metrics {
			gap: 10px;
		}
		.metric {
			padding: 15px;
		}
		.metric-top {
			font-size: 10px;
		}
		.metric > strong {
			font-size: 32px;
		}
		.connect-strip {
			flex-wrap: wrap;
			padding: 16px;
		}
		.connect-strip > div {
			flex: 1;
			min-width: 170px;
		}
		.connect-strip .btn {
			margin-left: 53px;
		}
		.inspiration h2 {
			font-size: 22px;
		}
		.link-row {
			gap: 10px;
		}
	}
</style>
