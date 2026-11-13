<script lang="ts">
	import Icon from '#lib/Icon.svelte';
	import Brand from './Brand.svelte';
	let active = $state<'board' | 'calendar'>('board');
	const columns = [
		{
			name: 'Ideas',
			color: 'lavender',
			cards: [
				{
					title: 'A slower kind of morning',
					tag: 'A little inspiration',
					tone: 'sage',
				},
				{
					title: 'Behind the creative process',
					tag: 'An idea to explore',
					tone: 'lavender',
				},
			],
		},
		{
			name: 'Drafts',
			color: 'peach',
			cards: [
				{
					title: 'Small rituals, good days',
					tag: 'Ready for the details',
					tone: 'peach',
				},
			],
		},
		{
			name: 'Scheduled',
			color: 'sky',
			cards: [
				{
					title: 'A moment worth sharing',
					tag: 'Tomorrow · 09:00',
					tone: 'sky',
				},
			],
		},
		{
			name: 'Published',
			color: 'sage',
			cards: [
				{
					title: 'Finding your own rhythm',
					tag: 'Shared with the world',
					tone: 'sage',
				},
			],
		},
	];
</script>

<div class="product-window glass">
	<div class="window-chrome">
		<div class="traffic"><i></i><i></i><i></i></div>
		<span>your creative space</span><span class="demo-label"
			>Illustrative preview</span
		>
	</div>
	<div class="product-body">
		<aside>
			<Brand small /><span class="mini-label">WORKSPACE</span>
			<div class="mini-nav">
				<span><Icon name="dashboard" size={14} />Overview</span><span
					><Icon name="list" size={14} />All posts</span
				><button
					class:active={active === 'board'}
					onclick={() => (active = 'board')}
					><Icon name="kanban" size={14} />Board</button
				><button
					class:active={active === 'calendar'}
					onclick={() => (active = 'calendar')}
					><Icon name="calendar" size={14} />Calendar</button
				>
			</div>
			<div class="mini-note">
				<Icon name="leaf" size={19} />
				<p>A little planning.<br />More room to create.</p>
			</div>
			<span class="mini-settings"
				><Icon name="settings" size={14} />Settings</span
			>
		</aside>
		<div class="product-main">
			<div class="mini-top">
				<div class="preview-switch">
					<button
						aria-pressed={active === 'board'}
						onclick={() => (active = 'board')}>Board</button
					><button
						aria-pressed={active === 'calendar'}
						onclick={() => (active = 'calendar')}>Calendar</button
					>
				</div>
				<span
					>Workspace <i>/</i> {active === 'board' ? 'Board' : 'Calendar'}</span
				><span class="mini-create"
					><Icon name="plus" size={11} />Create post</span
				>
			</div>
			<div class="mini-heading">
				<div>
					<span class="mini-label"
						>{active === 'board'
							? 'YOUR CONTENT BOARD'
							: 'YOUR PUBLISHING CALENDAR'}</span
					>
					<h3>
						{active === 'board'
							? 'Good ideas, taking shape.'
							: "Make room for what's next."}
					</h3>
					<p>
						{active === 'board'
							? 'A little structure for your creative flow.'
							: 'A gentle rhythm for your content.'}
					</p>
				</div>
				<span class="mini-avatar">Y</span>
			</div>
			{#if active === 'board'}<div class="preview-board">
					{#each columns as col}<div class="preview-col">
							<div class="preview-col-head">
								<span><i class={col.color}></i>{col.name}</span><b
									>{col.cards.length}</b
								>
							</div>
							{#each col.cards as card}<div class="preview-card">
									<div class="art {card.tone}">
										<div class="art-shape"></div>
										<span
											><Icon
												name={col.name === 'Ideas' ? 'bulb' : 'video'}
												size={14}
											/></span
										>
									</div>
									<strong>{card.title}</strong><small>{card.tag}</small><span
										class="mini-tag {col.color}"
										>{col.name === 'Ideas'
											? 'Idea'
											: col.name === 'Drafts'
												? 'Draft'
												: col.name}</span
									>
								</div>{/each}{#if col.name === 'Ideas'}<div class="mini-add">
									<Icon name="plus" size={11} />A new little idea…
								</div>{/if}
						</div>{/each}
				</div>{:else}<div class="preview-calendar">
					<div class="preview-month">
						Your month, thoughtfully planned.<span
							><Icon name="left" size={13} /><Icon
								name="right"
								size={13}
							/></span
						>
					</div>
					<div class="mini-days">
						{#each ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as day}<b
								>{day}</b
							>{/each}{#each Array.from({ length: 28 }, (_, i) => i + 1) as day}<div
							>
								<span class:highlight={day === 12}>{day}</span
								>{#if [4, 12, 17, 23].includes(day)}<small
										class={day < 12 ? 'sage' : 'sky'}
										>{day < 12 ? 'Published' : '09:00 · Next post'}</small
									>{/if}
							</div>{/each}
					</div>
				</div>{/if}
		</div>
	</div>
</div>

<style>
	.preview-switch {
		display: none;
	}
	@media (max-width: 540px) {
		.preview-switch {
			display: flex;
			gap: 6px;
		}
		.preview-switch button {
			background: none;
			border: 0;
			border-radius: 5px;
			color: var(--muted);
			font-size: 9px;
			padding: 5px 7px;
			cursor: pointer;
		}
		.preview-switch button[aria-pressed='true'] {
			background: white;
			color: var(--primary);
		}
		.mini-top > span:first-of-type {
			display: none;
		}
	}
	.product-window {
		width: 100%;
		border-radius: 20px;
		overflow: hidden;
		background: #fafbf6b3;
		border-color: #fff;
		box-shadow:
			0 30px 90px #3b4b3321,
			0 3px 8px #3b4b3305;
		text-align: left;
	}
	.window-chrome {
		height: 37px;
		border-bottom: 1px solid #dde3d580;
		display: flex;
		align-items: center;
		padding: 0 17px;
		position: relative;
		font-size: 9px;
		color: #939b8d;
		background: #ffffff70;
	}
	.traffic {
		display: flex;
		gap: 5px;
		margin-right: auto;
	}
	.traffic i {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: #d8c4bc;
	}
	.traffic i:nth-child(2) {
		background: #e1d6af;
	}
	.traffic i:nth-child(3) {
		background: #b9cba7;
	}
	.window-chrome > span:first-of-type {
		position: absolute;
		left: 50%;
		transform: translateX(-50%);
	}
	.demo-label {
		font-size: 8px;
		letter-spacing: 0.03em;
	}
	.product-body {
		display: grid;
		grid-template-columns: 154px minmax(0, 1fr);
		min-height: 440px;
	}
	aside {
		padding: 23px 13px;
		display: flex;
		flex-direction: column;
		border-right: 1px solid #dde3d580;
		background: #eef2e780;
	}
	aside :global(.brand) {
		font-size: 15px;
		gap: 7px;
	}
	aside :global(.mark) {
		width: 26px;
		height: 26px;
		border-radius: 8px;
	}
	aside > .mini-label {
		margin: 33px 10px 12px;
	}
	.mini-label {
		font-size: 7px;
		color: #919a87;
		letter-spacing: 0.13em;
		font-weight: 500;
	}
	.mini-nav {
		display: flex;
		flex-direction: column;
		gap: 5px;
	}
	.mini-nav > span,
	.mini-nav > button {
		display: flex;
		align-items: center;
		gap: 9px;
		padding: 10px;
		border: 0;
		border-radius: 7px;
		background: none;
		color: #828d78;
		font-size: 10px;
		text-align: left;
	}
	.mini-nav > button {
		cursor: pointer;
	}
	.mini-nav > .active {
		background: #fff;
		color: #4d6844;
		box-shadow: 0 3px 10px #243a2105;
	}
	.mini-note {
		margin: auto 10px 20px;
		color: #98a58a;
		font-size: 9px;
		padding-top: 40px;
	}
	.mini-note p {
		line-height: 1.8;
	}
	.mini-settings {
		display: flex;
		align-items: center;
		gap: 9px;
		margin: 0 10px;
		font-size: 10px;
		color: #85917a;
	}
	.product-main {
		padding: 0 23px 24px;
		min-width: 0;
	}
	.mini-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 52px;
		font-size: 8px;
		color: #87947d;
		border-bottom: 1px solid #dde3d580;
	}
	.mini-top i {
		margin: 0 9px;
		color: #b4bbac;
		font-style: normal;
	}
	.mini-create {
		display: flex;
		align-items: center;
		gap: 4px;
		background: var(--primary);
		color: #fff;
		padding: 7px 10px;
		border-radius: 6px;
		font-size: 8px;
	}
	.mini-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 24px 0 22px;
	}
	.mini-heading h3 {
		font-size: 23px;
		font-weight: 450;
		letter-spacing: -0.8px;
		margin: 6px 0 7px;
	}
	.mini-heading p {
		font-size: 9px;
		color: #929c89;
		margin: 0;
	}
	.mini-avatar {
		display: grid;
		place-items: center;
		width: 25px;
		height: 25px;
		border-radius: 50%;
		background: #e5ddeb;
		font-size: 9px;
		color: #8d7794;
	}
	.preview-board {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 10px;
	}
	.preview-col {
		min-width: 0;
		padding: 9px;
		background: #edf1e68c;
		border: 1px solid #fff;
		border-radius: 10px;
		min-height: 280px;
	}
	.preview-col-head {
		display: flex;
		justify-content: space-between;
		font-size: 9px;
		margin: 2px 0 14px;
	}
	.preview-col-head > span {
		display: flex;
		gap: 5px;
		align-items: center;
	}
	.preview-col-head i {
		width: 5px;
		height: 5px;
		border-radius: 50%;
	}
	.preview-col-head b {
		font-size: 8px;
		font-weight: 400;
		color: #8b957e;
	}
	.preview-card {
		padding: 8px;
		background: #ffffffd9;
		border: 1px solid white;
		box-shadow: 0 3px 10px #45533703;
		border-radius: 9px;
		margin-bottom: 9px;
	}
	.preview-card strong {
		display: block;
		margin-top: 9px;
		font-size: 9px;
		line-height: 1.6;
		font-weight: 500;
	}
	.preview-card > small {
		display: block;
		font-size: 7px;
		color: #99a08f;
		margin: 5px 0 10px;
	}
	.art {
		height: 65px;
		border-radius: 6px;
		position: relative;
		overflow: hidden;
		background: #e5ebda;
	}
	.art-shape {
		height: 85px;
		width: 65px;
		border-radius: 50%;
		position: absolute;
		right: 15%;
		top: 15px;
		background: linear-gradient(120deg, #ffffffb3, #83957426);
		transform: rotate(25deg);
		box-shadow: -25px 12px 0 #ffffff59;
	}
	.art > span {
		position: absolute;
		left: 7px;
		bottom: 6px;
		color: #8d9a80;
	}
	.lavender {
		background: #e9e2f0 !important;
	}
	.peach {
		background: #f0e2d5 !important;
	}
	.sky {
		background: #e0e9ef !important;
	}
	.sage {
		background: #dde8d3 !important;
	}
	.mini-tag {
		font-size: 7px;
		padding: 3px 6px;
		border-radius: 4px;
		color: #6c7e60;
	}
	.mini-add {
		display: flex;
		align-items: center;
		gap: 5px;
		font-size: 8px;
		color: #9aa58d;
		padding: 5px;
	}
	.preview-calendar {
		padding: 18px;
		background: #ffffff7d;
		border: 1px solid white;
		border-radius: 12px;
	}
	.preview-month {
		display: flex;
		justify-content: space-between;
		font-size: 10px;
		margin-bottom: 16px;
	}
	.preview-month > span {
		display: flex;
		gap: 15px;
	}
	.mini-days {
		display: grid;
		grid-template-columns: repeat(7, minmax(0, 1fr));
		font-size: 9px;
	}
	.mini-days > b {
		font-size: 7px;
		color: #8e9885;
		font-weight: 500;
		padding: 0 5px 10px;
	}
	.mini-days > div {
		min-height: 53px;
		border-top: 1px solid #dce2d4;
		border-right: 1px solid #dce2d4;
		padding: 5px;
		min-width: 0;
	}
	.mini-days > div > span {
		font-size: 8px;
		padding: 3px;
	}
	.mini-days small {
		display: block;
		font-size: 6px;
		padding: 3px;
		margin-top: 5px;
		border-radius: 3px;
		overflow: hidden;
		white-space: nowrap;
	}
	.highlight {
		background: var(--primary);
		color: white;
		border-radius: 5px;
	}
	@media (max-width: 800px) {
		.product-body {
			grid-template-columns: 120px 1fr;
			min-height: 380px;
		}
		.product-main {
			padding: 0 15px 18px;
		}
		.mini-heading h3 {
			font-size: 20px;
		}
		.preview-board {
			gap: 6px;
		}
		.preview-col {
			padding: 6px;
			min-height: 250px;
		}
		.preview-card {
			padding: 6px;
		}
		.art {
			height: 50px;
		}
		.mini-note {
			padding-top: 10px;
		}
	}
	@media (max-width: 540px) {
		.product-body {
			grid-template-columns: 1fr;
		}
		.product-body aside {
			display: none;
		}
		.mini-heading h3 {
			font-size: 18px;
		}
		.mini-top {
			height: 40px;
		}
		.mini-heading {
			padding: 18px 0;
		}
		.preview-board {
			grid-template-columns: repeat(4, minmax(100px, 1fr));
			overflow: auto;
			padding-bottom: 8px;
		}
		.preview-col {
			min-height: 230px;
		}
		.product-window {
			border-radius: 14px;
		}
		.window-chrome {
			height: 30px;
		}
		.product-main {
			padding: 0 12px 12px;
		}
		.preview-calendar {
			padding: 10px;
		}
		.mini-days > div {
			min-height: 45px;
		}
		.demo-label {
			font-size: 7px;
		}
	}
</style>
