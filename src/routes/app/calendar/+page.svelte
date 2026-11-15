<script lang="ts">
	import { page } from '$app/state';
	import { site } from '#lib';
	import Icon from '#lib/Icon.svelte';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import EmptyState from '#lib/ui/EmptyState.svelte';
	import { statusLabel, title, type PostView as Post } from '#lib/posts.ts';
	import PlatformBadge from '#lib/ui/PlatformBadge.svelte';
	import type { PageProps } from './$types';
	let { data }: PageProps = $props();
	let view = $state('month');
	let selected = $state('');
	let dayDialog = $state<HTMLDialogElement>();
	$effect(() => {
		if (selected && dayDialog && !dayDialog.open) dayDialog.showModal();
	});
	const pad = (n: number) => String(n).padStart(2, '0');
	const ymd = (d: Date) =>
		`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
	const ym = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
	const month = $derived.by(() => {
		const m = page.url.searchParams.get('m')?.match(/^(\d{4})-(\d{2})$/);
		return m && Number(m[2]) >= 1 && Number(m[2]) <= 12
			? new Date(Number(m[1]), Number(m[2]) - 1, 1)
			: new Date(new Date().getFullYear(), new Date().getMonth(), 1);
	});
	const shift = (n: number) =>
		ym(new Date(month.getFullYear(), month.getMonth() + n, 1));
	const days = $derived.by(() => {
		const start = new Date(month);
		start.setDate(1 - ((start.getDay() + 6) % 7));
		return Array.from(
			{ length: 42 },
			(_, i) =>
				new Date(start.getFullYear(), start.getMonth(), start.getDate() + i),
		);
	});
	const when = (p: Post) =>
		(p.status === 'published' ? p.published_at : p.scheduled_at) ??
		p.published_at ??
		0;
	const byDay = $derived.by(() => {
		const map = new Map<string, Post[]>();
		for (const p of data.posts) {
			const key = ymd(new Date(when(p)));
			map.set(
				key,
				[...(map.get(key) ?? []), p].sort((a, b) => when(a) - when(b)),
			);
		}
		return map;
	});
	const today = ymd(new Date());
	const time = (p: Post) =>
		new Date(when(p)).toLocaleTimeString(undefined, {
			hour: '2-digit',
			minute: '2-digit',
		});
	const monthTitle = $derived(
		month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
	);
	const monthPosts = $derived(
		data.posts
			.filter((p) => ym(new Date(when(p))) === ym(month))
			.toSorted((a, b) => when(a) - when(b)),
	);
	const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
	const selectedPosts = $derived(byDay.get(selected) ?? []);
	const selectedDate = $derived(
		selected ? new Date(selected + 'T12:00:00') : null,
	);
</script>

<svelte:head><title>Calendar – {site.name}</title></svelte:head>
<PageHeader
	title="Make room for what's next."
	description="A gentle rhythm for your content. Plan a day, then make it yours."
	eyebrow="Your publishing calendar"
/>
<section class="card cal">
	<div class="calendar-toolbar">
		<div class="month-nav">
			<h2>{monthTitle}</h2>
			<div class="arrows">
				<a class="icon-btn" href="?m={shift(-1)}" aria-label="Previous month"
					><Icon name="left" size={16} /></a
				><a class="icon-btn" href="?m={shift(1)}" aria-label="Next month"
					><Icon name="right" size={16} /></a
				>
			</div>
			<a href="?" class="btn ghost sm">Today</a>
		</div>
		<div class="segmented view-control">
			<button class:active={view === 'month'} onclick={() => (view = 'month')}
				>Month</button
			><button
				class:active={view === 'agenda'}
				onclick={() => (view = 'agenda')}>Agenda</button
			>
		</div>
	</div>
	<div class="calendar-meta">
		<span><Icon name="clock" size={12} />{timezone}</span>
		<div>
			<span class="legend scheduled">Scheduled</span><span
				class="legend published">Published</span
			><span class="legend failed">Failed</span>
		</div>
	</div>
	<div class="month-grid" class:hidden={view === 'agenda'}>
		<div class="weekdays">
			{#each ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as w}<div>
					{w}
				</div>{/each}
		</div>
		<div class="days">
			{#each days as d}{@const key = ymd(d)}{@const items =
					byDay.get(key) ?? []}
				<div
					class="day"
					class:out={d.getMonth() !== month.getMonth()}
					class:today={key === today}
				>
					<button
						class="day-button"
						aria-label={`${key}, ${items.length} posts. Open day details`}
						onclick={() => (selected = key)}
						><span class="date">{d.getDate()}</span>{#if items.length}<span
								class="day-count">{items.length}</span
							>{:else}<span class="day-plus"
								><Icon name="plus" size={12} /></span
							>{/if}</button
					>{#each items.slice(0, 3) as p}<a
							class="chip {p.status}"
							href="/app/posts/{p.id}?from=calendar"
							title={`${statusLabel[p.status]} · ${title(p)}`}
							><b>{time(p)}</b>{#each p.targets as t (t.platform)}<PlatformBadge
								platform={t.platform}
								size={14}
							/>{/each}<span>{title(p)}</span></a
						>{/each}{#if items.length > 3}<button
							class="more-posts"
							onclick={() => (selected = key)}>+{items.length - 3} more</button
						>{/if}
				</div>{/each}
		</div>
	</div>
	<div class="agenda" class:explicit={view === 'agenda'}>
		{#each monthPosts as p}<a
				class="agenda-row"
				href="/app/posts/{p.id}?from=calendar"
				><span class="agenda-date"
					><b>{new Date(when(p)).getDate()}</b><small
						>{new Date(when(p)).toLocaleDateString(undefined, {
							weekday: 'short',
						})}</small
					></span
				><span class="agenda-content"
					><strong>{title(p)}</strong><small>{time(p)} · {timezone}</small
					></span
				><span class="pill {p.status}">{statusLabel[p.status]}</span></a
			>{:else}<EmptyState
				title="A fresh page for this month."
				description="Choose a day and give your next post a place to land."
				icon="calendar"
				href="/app/posts/new"
				action="Plan a post"
			/>{/each}<a
			class="btn sm agenda-create"
			href="/app/posts/new?date={ym(month) === ym(new Date())
				? today
				: ymd(month)}"><Icon name="plus" size={14} />Plan a post</a
		>
	</div>
</section>
{#if selectedDate}<dialog
		class="day-details card"
		bind:this={dayDialog}
		aria-label="Day details"
		onclose={() => (selected = '')}
	>
		<div class="card-head">
			<div>
				<span class="eyebrow">Your day, at a glance</span>
				<h2>
					{selectedDate.toLocaleDateString(undefined, {
						weekday: 'long',
						month: 'long',
						day: 'numeric',
					})}
				</h2>
			</div>
			<button
				class="icon-btn"
				aria-label="Close day details"
				onclick={() => dayDialog?.close()}
				><Icon name="close" size={16} /></button
			>
		</div>
		{#each selectedPosts as p}<a
				class="link-row"
				href="/app/posts/{p.id}?from=calendar"
				><span class="grow"
					><strong>{title(p)}</strong><small>{time(p)} · {timezone}</small
					></span
				><span class="pill {p.status}">{statusLabel[p.status]}</span></a
			>{:else}<p class="muted">
				Nothing planned for this day yet.
			</p>{/each}{#if selected >= today}<a
				class="btn primary sm"
				href="/app/posts/new?date={selected}&from=calendar"
				><Icon name="plus" size={14} />Plan a post</a
			>{/if}
	</dialog>{/if}

<style>
	.cal {
		padding: 24px;
	}
	.calendar-toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
	}
	.month-nav {
		display: flex;
		align-items: center;
		gap: 18px;
	}
	.month-nav h2 {
		margin: 0;
		font-size: 22px;
		min-width: 175px;
	}
	.arrows {
		display: flex;
		gap: 5px;
	}
	.arrows .icon-btn {
		width: 30px;
		height: 30px;
		border: 0;
		background: transparent;
	}
	.calendar-meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin: 22px 0;
		font-size: 10px;
		color: var(--muted);
		gap: 12px;
	}
	.calendar-meta > span {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.calendar-meta > div {
		display: flex;
		gap: 14px;
	}
	.legend {
		display: flex;
		align-items: center;
		gap: 5px;
	}
	.legend::before {
		content: '';
		width: 5px;
		height: 5px;
		background: #91afc5;
		border-radius: 50%;
	}
	.legend.published::before {
		background: #92ac80;
	}
	.legend.failed::before {
		background: #bc8490;
	}
	.weekdays,
	.days {
		display: grid;
		grid-template-columns: repeat(7, minmax(0, 1fr));
	}
	.weekdays div {
		font-size: 10px;
		color: var(--muted);
		padding: 8px 12px 14px;
	}
	.days {
		border-top: 1px solid var(--line);
		border-left: 1px solid var(--line);
		border-radius: 14px;
		overflow: hidden;
	}
	.day {
		min-height: 115px;
		border-right: 1px solid var(--line);
		border-bottom: 1px solid var(--line);
		padding: 7px;
		min-width: 0;
	}
	.day.out {
		background: #eef1e655;
	}
	.day.out .date {
		color: #929b8c;
	}
	.day.today {
		background: #f2f5eb;
	}
	.day-button {
		display: flex;
		width: 100%;
		justify-content: space-between;
		align-items: center;
		background: transparent;
		border: 0;
		padding: 0;
		margin-bottom: 5px;
		cursor: pointer;
	}
	.date {
		display: grid;
		place-items: center;
		width: 25px;
		height: 25px;
		font-size: 11px;
		border-radius: 8px;
	}
	.today .date {
		background: var(--primary);
		color: white;
	}
	.day-plus {
		display: grid;
		place-items: center;
		width: 22px;
		height: 22px;
		color: #9ba78e;
		opacity: 0;
	}
	.day:hover .day-plus,
	.day-button:focus-visible .day-plus {
		opacity: 1;
	}
	.day-count {
		font-size: 9px;
		color: var(--muted);
	}
	.chip {
		display: flex;
		gap: 5px;
		align-items: center;
		padding: 5px 6px;
		margin-bottom: 4px;
		border-radius: 6px;
		font-size: 9px;
		line-height: 1.4;
		background: var(--sky);
		color: #4c6b85;
		text-decoration: none;
		min-width: 0;
	}
	.chip b {
		font-weight: 500;
		flex: none;
	}
	.chip span {
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
	.chip.published {
		background: var(--ok-soft);
		color: var(--ok);
	}
	.chip.failed {
		background: var(--danger-soft);
		color: var(--danger);
	}
	.chip.publishing {
		background: var(--warn-soft);
		color: var(--warn);
	}
	.more-posts {
		border: 0;
		background: none;
		font-size: 9px;
		color: var(--muted);
		cursor: pointer;
	}
	.agenda {
		display: none;
	}
	.agenda.explicit {
		display: block;
	}
	.month-grid.hidden {
		display: none;
	}
	.agenda-row {
		display: flex;
		align-items: center;
		gap: 18px;
		text-decoration: none;
		color: var(--ink);
		padding: 18px 0;
		border-top: 1px solid var(--line);
	}
	.agenda-date {
		display: flex;
		flex-direction: column;
		align-items: center;
		min-width: 36px;
	}
	.agenda-date b {
		font-size: 22px;
		font-weight: 450;
		line-height: 1.2;
	}
	.agenda-date small {
		font-size: 10px;
		color: var(--muted);
	}
	.agenda-content {
		flex: 1;
		min-width: 0;
	}
	.agenda-content strong {
		display: block;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
		font-size: 13px;
		font-weight: 500;
	}
	.agenda-content small {
		font-size: 10px;
		color: var(--muted);
	}
	.agenda-create {
		margin-top: 15px;
	}
	.day-details {
		margin: 16px 16px 16px auto;
		width: 420px;
		height: calc(100dvh - 32px);
		max-height: none;
		background: #f8faf4f5;
	}
	.day-details h2 {
		margin: 6px 0 0;
		font-size: 21px;
	}
	.day-details p {
		font-size: 13px;
	}
	.day-details > .btn {
		margin-top: 16px;
	}
	@media (max-width: 1100px) {
		.month-nav {
			gap: 8px;
		}
		.month-nav h2 {
			font-size: 19px;
			min-width: 150px;
		}
		.chip b {
			display: none;
		}
	}
	@media (max-width: 640px) {
		.cal {
			padding: 18px;
		}
		.view-control {
			display: none;
		}
		.month-grid {
			display: none;
		}
		.agenda {
			display: block;
		}
		.month-nav {
			width: 100%;
			gap: 8px;
		}
		.month-nav h2 {
			flex: 1;
			min-width: 0;
			font-size: 20px;
		}
		.calendar-meta {
			flex-wrap: wrap;
		}
		.calendar-meta > div {
			gap: 10px;
			font-size: 9px;
		}
		.agenda-row {
			gap: 12px;
		}
		.agenda-content strong {
			font-size: 12px;
		}
		.agenda-row .pill {
			font-size: 10px;
		}
		.day-details h2 {
			font-size: 18px;
		}
	}
</style>
