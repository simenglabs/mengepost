<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import { site } from '#lib';
	import Icon from '#lib/Icon.svelte';
	import {
		COLUMNS,
		LOCKED,
		postSummary,
		statusLabel,
		title,
		type PostView,
		type Status,
	} from '#lib/posts.ts';
	import { readinessError } from '#lib/targets.ts';
	import PlatformBadge from '#lib/ui/PlatformBadge.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// Local copy so drags update instantly; resynced whenever server data changes.
	let posts = $state<PostView[]>([]);
	$effect(() => {
		posts = data.posts.map((p) => ({ ...p }));
	});

	let dragging = $state<string | null>(null);
	let over = $state<string | null>(null);
	let error = $state('');
	let adding = $state<string | null>(null);
	let moving = $state(false);
	let quick = $state<Record<string, string>>({ idea: '', draft: '' });

	const inColumn = (statuses: Status[]) =>
		posts
			.filter((p) => statuses.includes(p.status))
			.sort(
				(a, b) =>
					(a.scheduled_at ?? a.updated_at) - (b.scheduled_at ?? b.updated_at),
			);

	async function move(id: string, status: Status) {
		const post = posts.find((p) => p.id === id);
		if (
			!post ||
			post.status === status ||
			LOCKED.includes(post.status) ||
			moving
		)
			return;
		if (status === 'scheduled') {
			const issue = readinessError(post);
			if (issue) {
				error = issue;
				return;
			}
		}
		if (
			status === 'scheduled' &&
			(!post.scheduled_at || post.scheduled_at < Date.now())
		) {
			await goto(`/app/posts/${id}?schedule=1&from=board`);
			return;
		}
		const prev = post.status;
		post.status = status;
		error = '';
		moving = true;
		try {
			const res = await fetch(`/api/posts/${id}`, {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ status }),
			});
			if (!res.ok)
				throw new Error(
					((await res.json()) as { message?: string }).message ??
						'Could not move the post.',
				);
			await invalidateAll();
		} catch (e) {
			post.status = prev;
			error = (e as Error).message;
		} finally {
			moving = false;
		}
	}
	async function add(status: 'idea' | 'draft') {
		const caption = quick[status].trim();
		if (!caption || adding) return;
		adding = status;
		error = '';
		try {
			const res = await fetch('/api/posts', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ caption, status }),
			});
			if (!res.ok)
				throw new Error(
					((await res.json()) as { message?: string }).message ??
						'Could not save. Your text is still here.',
				);
			quick[status] = '';
			await invalidateAll();
		} catch (e) {
			error = (e as Error).message;
		} finally {
			adding = null;
		}
	}

	const when = (p: PostView) =>
		new Date(
			(p.status === 'published' ? p.published_at : p.scheduled_at)!,
		).toLocaleString(undefined, {
			day: 'numeric',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit',
		});
</script>

<svelte:head>
	<title>Board – {site.name}</title>
</svelte:head>

<PageHeader
	title="Good ideas, taking shape."
	description="A little structure for your creative flow. Move posts as they grow."
	eyebrow="Your content board"
/>
{#if error}<p class="alert" role="alert">{error}</p>{/if}

<div class="board">
	{#each COLUMNS as col (col.key)}
		{@const items = inColumn(col.statuses)}
		<section
			class="col {col.key}"
			class:over={over === col.key}
			class:locked={col.key === 'published'}
			aria-label={col.title}
			ondragover={(e) => {
				if (col.key === 'published' || !dragging) return;
				e.preventDefault();
				over = col.key;
			}}
			ondragleave={() => (over = null)}
			ondrop={(e) => {
				e.preventDefault();
				over = null;
				if (dragging) move(dragging, col.key as Status);
			}}
		>
			<header>
				<h2 class="card-title">{col.title}</h2>
				<span class="count">{items.length}</span>
			</header>

			{#if col.key === 'idea' || col.key === 'draft'}
				<form
					class="quick"
					onsubmit={(e) => (
						e.preventDefault(),
						add(col.key as 'idea' | 'draft')
					)}
				>
					<input
						class="input"
						aria-label={col.key === 'idea' ? 'Quick idea' : 'New draft'}
						maxlength="2200"
						disabled={adding === col.key}
						placeholder={col.key === 'idea' ? 'Quick idea…' : 'New draft…'}
						bind:value={quick[col.key]}
					/>
					<button class="icon-btn" aria-label="Add" disabled={!!adding}
						><Icon name="plus" size={16} /></button
					>
				</form>
			{/if}

			<ul>
				{#each items as p (p.id)}
					<li
						class="item"
						class:dragging={dragging === p.id}
						draggable={!LOCKED.includes(p.status)}
						ondragstart={(e) => {
							dragging = p.id;
							e.dataTransfer?.setData('text/plain', p.id);
						}}
						ondragend={() => (dragging = null)}
					>
						<a href="/app/posts/{p.id}?from=board">
							<strong>{title(p)}</strong>
							<span class="meta">
								{#if p.status !== col.key}<span class="pill {p.status}"
										>{statusLabel[p.status]}</span
									>{/if}
								{#each p.targets as t (t.platform)}<PlatformBadge
										platform={t.platform}
										status={t.status}
										size={20}
									/>{/each}
							</span>
							{#if p.scheduled_at || p.published_at}
								<span class="when"
									><Icon name="clock" size={14} /> {when(p)}</span
								>
							{/if}
							{#if postSummary(p)}<span class="reason" class:ok={p.status !== 'failed'}
									>{postSummary(p)}</span
								>{/if}
						</a>
						{#if !LOCKED.includes(p.status)}<select
								class="move-control"
								aria-label={`Move ${title(p)} to status`}
								value=""
								disabled={moving}
								onchange={(e) => {
									if (e.currentTarget.value)
										move(p.id, e.currentTarget.value as Status);
									e.currentTarget.value = '';
								}}
								><option value="">Move to…</option
								>{#each ['idea', 'draft', 'scheduled'] as st}{#if p.status !== st}<option
											value={st}>{statusLabel[st as Status]}</option
										>{/if}{/each}</select
							>{/if}
					</li>
				{:else}
					<li class="empty">
						{col.key === 'published'
							? 'Published posts appear here.'
							: col.key === 'idea'
								? 'A small thought can start something.'
								: col.key === 'draft'
									? 'Space for your work in progress.'
									: 'Your next posts will land here.'}
					</li>
				{/each}
			</ul>
		</section>
	{/each}
</div>

<style>
	.head {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 16px;
		margin-bottom: 16px;
	}
	.alert {
		margin: 0 0 12px;
	}
	.board {
		display: grid;
		grid-template-columns: repeat(4, minmax(225px, 1fr));
		gap: 14px;
		overflow-x: auto;
		padding-bottom: 8px;
	}
	.col {
		background: #ffffff59;
		border: 1px solid #ffffffba;
		border-radius: var(--radius-lg);
		padding: 14px;
		min-height: 62vh;
		transition:
			border-color 0.15s,
			background 0.15s;
	}
	.col.over {
		border-color: var(--primary);
		background: var(--primary-soft);
	}
	.col.locked {
		background: var(--tile);
	}
	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 12px;
	}
	.count {
		min-width: 26px;
		padding: 2px 8px;
		border-radius: 999px;
		background: #ffffffb3;
		color: var(--muted);
		font-size: 12px;
		font-weight: 700;
		text-align: center;
	}
	.quick {
		display: flex;
		gap: 6px;
		margin-bottom: 10px;
	}
	.quick .input {
		padding: 8px 12px;
		border-radius: 999px;
	}
	.quick .icon-btn {
		flex: none;
		width: 36px;
		height: 36px;
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.item a {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 12px;
		border-radius: var(--radius);
		background: var(--surface);
		border: 1px solid var(--line);
		box-shadow: var(--shadow);
		color: var(--ink);
		text-decoration: none;
	}
	.item[draggable='true'] a {
		cursor: grab;
	}
	.item.dragging {
		opacity: 0.4;
	}
	.item strong {
		font-size: 12px;
		font-weight: 500;
		line-height: 1.6;
	}
	.meta {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.tag {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 2px 8px;
		border-radius: 999px;
		background: var(--tile);
		color: var(--muted);
		font-size: 12px;
	}
	.when {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
		color: var(--primary);
		font-weight: 600;
	}
	.reason {
		font-size: 12px;
		color: var(--danger);
	}
	.reason.ok {
		color: var(--muted);
	}
	.empty {
		padding: 18px;
		border: 1.5px dashed var(--line-strong);
		border-radius: var(--radius);
		color: var(--muted);
		font-size: 13px;
		text-align: center;
	}
	.col header {
		padding: 5px 2px 12px;
		border-bottom: 1px solid var(--line);
	}
	.col.idea header h2::before,
	.col.draft header h2::before,
	.col.scheduled header h2::before,
	.col.published header h2::before {
		content: '';
		display: inline-block;
		width: 7px;
		height: 7px;
		margin-right: 8px;
		border-radius: 50%;
		background: #b8a5ce;
	}
	.col.draft header h2::before {
		background: #d2ad8e;
	}
	.col.scheduled header h2::before {
		background: #91afc5;
	}
	.col.published header h2::before {
		background: #92ac80;
	}
	.item {
		position: relative;
	}
	.item a {
		padding-bottom: 38px !important;
	}
	.move-control {
		position: absolute;
		bottom: 10px;
		left: 12px;
		font-size: 10px;
		color: var(--muted);
		border: 0;
		background: transparent;
		max-width: calc(100% - 24px);
		padding: 3px;
		cursor: pointer;
	}
	.empty {
		font-size: 11px;
		line-height: 1.8;
		border-color: #b8c3b14d;
		min-height: 115px;
		display: grid;
		place-items: center;
	}
	.board {
		scroll-snap-type: x proximity;
	}
	.col {
		scroll-snap-align: start;
	}
	.quick .input {
		font-size: 11px;
	}
	.tag {
		font-size: 10px;
	}
	.item .when {
		font-size: 10px;
	}
	.col.locked {
		background: #e8eedf66;
	}
	@media (max-width: 640px) {
		.board {
			grid-template-columns: repeat(4, minmax(260px, 82vw));
		}
		.quick .input {
			font-size: 16px;
		}
		.move-control {
			font-size: 12px;
			min-height: 30px;
		}
		.item a {
			padding-bottom: 44px !important;
		}
	}
</style>
