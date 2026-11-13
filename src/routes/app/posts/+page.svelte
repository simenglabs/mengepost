<script lang="ts">
	import { page } from '$app/state';
	import { site } from '#lib';
	import Icon from '#lib/Icon.svelte';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import EmptyState from '#lib/ui/EmptyState.svelte';
	import { statusLabel, title, type Status } from '#lib/posts.ts';
	import type { PageProps } from './$types';
	let { data }: PageProps = $props();
	let search = $state('');
	let sort = $state('updated');
	const status = $derived(page.url.searchParams.get('status') ?? 'all');
	const statuses = [
		'all',
		'idea',
		'draft',
		'scheduled',
		'publishing',
		'published',
		'failed',
	];
	const results = $derived(
		data.posts
			.filter(
				(p) =>
					(status === 'all' || p.status === status) &&
					p.caption.toLowerCase().includes(search.toLowerCase()),
			)
			.toSorted((a, b) =>
				sort === 'oldest'
					? a.created_at - b.created_at
					: sort === 'scheduled'
						? (a.scheduled_at ?? Infinity) - (b.scheduled_at ?? Infinity)
						: b.updated_at - a.updated_at,
			),
	);
	const date = (n: number) =>
		new Date(n).toLocaleDateString(undefined, {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
		});
</script>

<svelte:head><title>All posts – {site.name}</title></svelte:head>
<PageHeader
	title="Everything you're creating."
	description="A home for every idea, work in progress, and published moment."
	eyebrow="Your content library"
/>
<div class="library-toolbar">
	<label class="search"
		><Icon name="search" size={17} /><input
			aria-label="Search posts"
			placeholder="Find a post or an idea…"
			bind:value={search}
		/></label
	><label class="sort"
		><span>Sort by</span><select
			class="input"
			aria-label="Sort posts"
			bind:value={sort}
			><option value="updated">Recently updated</option><option value="oldest"
				>Oldest first</option
			><option value="scheduled">Scheduled date</option></select
		></label
	>
</div>
<nav class="filter-tabs" aria-label="Filter posts">
	{#each statuses as s}<a
			class:active={s === status}
			href={s === 'all' ? '/app/posts' : `?status=${s}`}
			aria-current={s === status ? 'page' : undefined}
			>{s === 'all' ? 'All posts' : statusLabel[s as Status]}<span
				>{s === 'all'
					? data.posts.length
					: data.posts.filter((p) => p.status === s).length}</span
			></a
		>{/each}
</nav>
<section class="card library">
	<div class="list-head">
		<span>Post</span><span>Status</span><span>Last updated</span><span></span>
	</div>
	{#each results as p}<a class="post-row" href="/app/posts/{p.id}?from=posts"
			><div class="post-title">
				<span class="post-thumb {p.status}"
					><Icon
						name={p.video_key ? 'video' : p.status === 'idea' ? 'bulb' : 'edit'}
						size={21}
					/></span
				><span
					><strong>{title(p)}</strong><small
						>{p.video_name ??
							(p.status === 'idea'
								? 'An idea worth keeping'
								: 'TikTok post')}{#if p.scheduled_at}
							· {new Date(p.scheduled_at).toLocaleString(undefined, {
								month: 'short',
								day: 'numeric',
								hour: '2-digit',
								minute: '2-digit',
							})}{/if}</small
					></span
				>
			</div>
			<span class="pill {p.status}">{statusLabel[p.status]}</span><span
				class="updated">{date(p.updated_at)}</span
			><Icon name="right" size={16} /></a
		>{:else}<EmptyState
			title={search ? 'No matching posts.' : 'A little idea goes a long way.'}
			description={search
				? 'Try another search or choose a different status.'
				: 'Start with an idea, add your video, and make it yours.'}
			icon={search ? 'search' : 'bulb'}
			href={search ? undefined : '/app/posts/new'}
			action="Create a post"
		/>{/each}
	<div class="list-footer">
		{results.length}
		{results.length === 1 ? 'post' : 'posts'}{status !== 'all'
			? ' in this view'
			: ''}
	</div>
</section>

<style>
	.library-toolbar {
		display: flex;
		gap: 20px;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 22px;
	}
	.search {
		display: flex;
		align-items: center;
		gap: 10px;
		background: #ffffff9c;
		border: 1px solid white;
		border-radius: 12px;
		padding: 10px 14px;
		width: min(390px, 100%);
		color: var(--muted);
	}
	.search:focus-within {
		outline: 2px solid #78937a;
	}
	.search input {
		background: none;
		border: 0;
		outline: 0 !important;
		width: 100%;
		font-size: 12px;
		color: var(--ink);
	}
	.sort {
		display: flex;
		align-items: center;
		gap: 10px;
		white-space: nowrap;
		font-size: 11px;
		color: var(--muted);
	}
	.sort select {
		font-size: 11px;
		padding: 9px 12px;
	}
	.filter-tabs {
		display: flex;
		gap: 5px;
		overflow-x: auto;
		margin-bottom: 18px;
		padding-bottom: 4px;
	}
	.filter-tabs a {
		display: flex;
		gap: 8px;
		align-items: center;
		padding: 8px 12px;
		border-radius: 10px;
		font-size: 11px;
		color: var(--muted);
		text-decoration: none;
		white-space: nowrap;
	}
	.filter-tabs a.active {
		background: #ffffffcf;
		color: var(--primary);
		box-shadow: var(--shadow);
	}
	.filter-tabs a span {
		font-size: 9px;
		padding: 1px 5px;
		border-radius: 5px;
		background: #e9ede4;
	}
	.library {
		padding: 0 24px;
		overflow: hidden;
	}
	.list-head,
	.post-row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 110px 120px 20px;
		align-items: center;
		gap: 18px;
	}
	.list-head {
		font-size: 10px;
		color: var(--muted);
		padding: 18px 0;
		border-bottom: 1px solid var(--line);
	}
	.post-row {
		padding: 17px 0;
		border-bottom: 1px solid var(--line);
		color: var(--ink);
		text-decoration: none;
	}
	.post-row:hover strong {
		color: var(--primary);
	}
	.post-title {
		display: flex;
		align-items: center;
		gap: 14px;
		min-width: 0;
	}
	.post-title > span:last-child {
		min-width: 0;
	}
	.post-title strong {
		font-size: 13px;
		font-weight: 500;
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.post-title small {
		display: block;
		font-size: 10px;
		color: var(--muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.post-thumb {
		display: grid;
		place-items: center;
		width: 44px;
		height: 52px;
		border-radius: 10px;
		flex: none;
		background: var(--tile);
		color: #90a183;
	}
	.post-thumb.idea {
		background: var(--lavender);
		color: #9885ab;
	}
	.post-row .pill {
		justify-self: start;
	}
	.updated {
		color: var(--muted);
		font-size: 11px;
	}
	.list-footer {
		font-size: 10px;
		color: var(--muted);
		padding: 15px 0;
	}
	@media (max-width: 640px) {
		.library-toolbar {
			align-items: stretch;
			flex-direction: column;
			gap: 10px;
		}
		.search {
			width: 100%;
		}
		.search input {
			font-size: 16px;
		}
		.sort {
			align-self: flex-end;
		}
		.sort select {
			width: auto;
		}
		.library {
			padding: 0 16px;
		}
		.list-head {
			display: none;
		}
		.post-row {
			grid-template-columns: minmax(0, 1fr) auto;
			gap: 10px;
		}
		.post-row > .updated,
		.post-row > :global(svg) {
			display: none;
		}
		.post-thumb {
			width: 34px;
			height: 44px;
		}
		.post-title {
			gap: 10px;
		}
		.post-title strong {
			font-size: 12px;
		}
	}
</style>
