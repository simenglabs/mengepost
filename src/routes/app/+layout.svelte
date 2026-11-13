<script lang="ts">
	import { page } from '$app/state';
	import Brand from '#lib/ui/Brand.svelte';
	import Icon, { type IconName } from '#lib/Icon.svelte';
	import type { LayoutProps } from './$types';
	let { children, data }: LayoutProps = $props();
	let menuOpen = $state(false);
	let drawer: HTMLDialogElement;
	let userOpen = $state(false);
	const nav: { href: string; label: string; icon: IconName }[] = [
		{ href: '/app', label: 'Overview', icon: 'dashboard' },
		{ href: '/app/posts', label: 'All posts', icon: 'list' },
		{ href: '/app/kanban', label: 'Board', icon: 'kanban' },
		{ href: '/app/calendar', label: 'Calendar', icon: 'calendar' },
	];
	const active = (href: string) =>
		href === '/app'
			? page.url.pathname === '/app'
			: page.url.pathname.startsWith(href);
	const current = $derived(
		page.url.pathname.startsWith('/app/settings')
			? 'Settings'
			: page.url.pathname === '/app/posts/new'
				? 'New post'
				: page.url.pathname.startsWith('/app/posts/')
					? 'Post editor'
					: (nav.find((n) => active(n.href))?.label ?? 'Workspace'),
	);
	const initials = (name: string) =>
		name
			.split(/\s+/)
			.map((w) => w[0])
			.slice(0, 2)
			.join('')
			.toUpperCase();
	$effect(() => {
		page.url.pathname;
		menuOpen = false;
		userOpen = false;
	});
	$effect(() => {
		if (!drawer) return;
		if (menuOpen && !drawer.open) drawer.showModal();
		else if (!menuOpen && drawer.open) drawer.close();
	});
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape') {
			menuOpen = false;
			userOpen = false;
		}
	}}
/>
<a href="#workspace" class="skip-link">Skip to content</a>
{#snippet navigation(mobile = false)}
	<div class="sidebar-top">
		<Brand href="/app" small />{#if mobile}<button
				class="icon-btn"
				aria-label="Close navigation"
				onclick={() => (menuOpen = false)}><Icon name="close" /></button
			>{/if}
	</div>
	<div class="workspace-label">
		<span class="workspace-dot"></span> YOUR WORKSPACE
	</div>
	<nav aria-label={mobile ? 'Mobile navigation' : 'Main navigation'}>
		{#each nav as item}<a
				href={item.href}
				aria-current={active(item.href) ? 'page' : undefined}
				><Icon
					name={item.icon}
					size={18}
				/>{item.label}{#if active(item.href)}<span class="active-dot"
					></span>{/if}</a
			>{/each}
	</nav>
	<div class="sidebar-bottom">
		<div class="quiet-note">
			<Icon name="leaf" size={20} />
			<p>A little planning.<br /><strong>More room to create.</strong></p>
		</div>
		<a class="connection" href="/app/settings#tiktok"
			><span class="connection-icon"><Icon name="link" size={16} /></span><span
				><strong>{data.tiktok ? 'TikTok connected' : 'Connect TikTok'}</strong
				><small
					>{data.tiktok?.display_name ?? 'Make your next post happen'}</small
				></span
			><span class:connected={!!data.tiktok} class="connection-dot"></span></a
		>
		<a
			class="settings-link"
			href="/app/settings"
			aria-current={current === 'Settings' ? 'page' : undefined}
			><Icon name="settings" size={18} />Settings</a
		>
	</div>
{/snippet}
<div class="shell">
	<aside class="desktop-sidebar glass">{@render navigation()}</aside>
	<div class="main">
		<header class="topbar">
			<div class="trail">
				<button
					class="icon-btn menu-btn"
					aria-label="Open navigation"
					aria-expanded={menuOpen}
					onclick={() => (menuOpen = true)}><Icon name="menu" /></button
				><span class="trail-workspace">Workspace <span>/</span></span><span
					>{current}</span
				>
			</div>
			<div class="top-actions">
				<a href="/app/posts/new" class="btn primary sm"
					><Icon name="plus" size={15} />Create post</a
				>
				<div class="user-wrap">
					<button
						class="user-button"
						aria-label="User menu"
						aria-expanded={userOpen}
						onclick={() => (userOpen = !userOpen)}
						><span class="avatar">{initials(data.user.name)}</span></button
					>{#if userOpen}<div class="user-menu glass">
							<strong>{data.user.name}</strong><small>{data.user.email}</small
							><a href="/app/settings">Account settings</a>
							<form method="POST" action="/logout">
								<button><Icon name="logout" size={16} />Log out</button>
							</form>
						</div>{/if}
				</div>
			</div>
		</header>
		<main id="workspace" tabindex="-1">{@render children()}</main>
		<footer class="workspace-footer">
			<span>Made for a calmer creative flow.</span><a href="/"
				>mengepost <Icon name="arrow" size={12} /></a
			>
		</footer>
	</div>
</div>
<dialog
	class="mobile-drawer"
	bind:this={drawer}
	onclose={() => (menuOpen = false)}
	oncancel={() => (menuOpen = false)}
	aria-label="Workspace navigation"
	onclick={(e) => {
		if (e.target === drawer) {
			const r = drawer.getBoundingClientRect();
			if (
				e.clientX > r.right ||
				e.clientY > r.bottom ||
				e.clientX < r.left ||
				e.clientY < r.top
			)
				menuOpen = false;
		}
	}}
>
	{@render navigation(true)}
</dialog>

<style>
	.shell {
		display: grid;
		grid-template-columns: 224px minmax(0, 1fr);
		gap: 30px;
		max-width: 1680px;
		margin: auto;
		padding: 20px;
		min-height: 100vh;
	}
	.desktop-sidebar {
		position: sticky;
		top: 20px;
		height: calc(100dvh - 40px);
		border-radius: 24px;
		padding: 24px 16px;
		display: flex;
		flex-direction: column;
	}
	.sidebar-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 8px;
	}
	.workspace-label {
		display: flex;
		align-items: center;
		gap: 6px;
		margin: 42px 12px 14px;
		font-size: 9px;
		font-weight: 600;
		letter-spacing: 0.13em;
		color: #879181;
	}
	.workspace-dot {
		width: 5px;
		height: 5px;
		background: #8a9e7b;
		border-radius: 50%;
	}
	nav {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	nav a,
	.settings-link {
		display: flex;
		align-items: center;
		gap: 12px;
		border-radius: 11px;
		padding: 12px 14px;
		text-decoration: none;
		color: var(--muted);
		font-size: 13px;
		font-weight: 500;
	}
	nav a:hover,
	.settings-link:hover {
		background: #ffffff80;
		color: var(--ink);
	}
	nav a[aria-current='page'],
	.settings-link[aria-current='page'] {
		background: #ffffffd9;
		color: var(--primary);
		box-shadow: 0 3px 12px #293b3205;
	}
	.active-dot {
		margin-left: auto;
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: #7e9471;
	}
	.sidebar-bottom {
		margin-top: auto;
	}
	.quiet-note {
		padding: 24px 12px;
		color: #92a184;
	}
	.quiet-note p {
		font-size: 12px;
		line-height: 1.7;
		margin: 8px 0 12px;
		color: #84907e;
	}
	.quiet-note strong {
		font-weight: 400;
		color: #687960;
	}
	.connection {
		display: flex;
		align-items: center;
		gap: 9px;
		background: #e9eee399;
		border: 1px solid #ffffffb3;
		padding: 12px 10px;
		border-radius: 14px;
		text-decoration: none;
		color: var(--ink);
		margin-bottom: 13px;
	}
	.connection-icon {
		color: #77906b;
	}
	.connection strong {
		font-size: 10px;
		font-weight: 600;
	}
	.connection small {
		display: block;
		font-size: 9px;
		color: var(--muted);
		max-width: 125px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.connection-dot {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: #b6baad;
		margin-left: auto;
		flex: none;
	}
	.connection-dot.connected {
		background: #729262;
	}
	.main {
		min-width: 0;
		display: flex;
		flex-direction: column;
	}
	.topbar {
		height: 54px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin-bottom: 33px;
		border-bottom: 1px solid var(--line);
		padding: 0 0 16px;
	}
	.trail {
		display: flex;
		align-items: center;
		gap: 14px;
		font-size: 11px;
	}
	.trail-workspace {
		color: var(--muted);
	}
	.trail-workspace span {
		margin-left: 14px;
		color: #b0b6ac;
	}
	.top-actions {
		display: flex;
		align-items: center;
		gap: 16px;
	}
	.user-button {
		border: 0;
		padding: 0;
		background: none;
		cursor: pointer;
	}
	.user-button .avatar {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		font-size: 10px;
		background: #e7dfed;
	}
	.user-wrap {
		position: relative;
	}
	.user-menu {
		position: absolute;
		right: 0;
		top: 45px;
		z-index: 20;
		width: 230px;
		padding: 16px;
		border-radius: 17px;
		background: #f7f9f3ee;
	}
	.user-menu strong {
		display: block;
		font-size: 13px;
	}
	.user-menu small {
		display: block;
		color: var(--muted);
		font-size: 11px;
		margin-bottom: 12px;
		overflow-wrap: anywhere;
	}
	.user-menu a,
	.user-menu button {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 9px 0;
		font-size: 12px;
		text-decoration: none;
		border: 0;
		background: none;
		cursor: pointer;
		width: 100%;
	}
	.user-menu form {
		border-top: 1px solid var(--line);
		margin-top: 5px;
	}
	main {
		flex: 1;
		outline: none;
		min-width: 0;
	}
	.workspace-footer {
		display: flex;
		justify-content: space-between;
		padding: 28px 0 4px;
		color: #8a9386;
		font-size: 10px;
	}
	.workspace-footer a {
		display: flex;
		align-items: center;
		gap: 5px;
		text-decoration: none;
		color: inherit;
	}
	.menu-btn {
		display: none;
	}
	.mobile-drawer {
		margin: 12px auto 12px 12px;
		width: 270px;
		max-width: calc(100vw - 24px);
		height: calc(100dvh - 24px);
		max-height: none;
		padding: 24px 16px;
		background: #f6f8f0f5;
	}
	.mobile-drawer[open] {
		display: flex;
		flex-direction: column;
	}
	.mobile-drawer::backdrop {
		background: #293b3229;
		backdrop-filter: blur(6px);
	}
	@media (min-width: 1440px) {
		.shell {
			gap: 42px;
			padding: 24px 32px;
		}
		.desktop-sidebar {
			top: 24px;
			height: calc(100dvh - 48px);
		}
	}
	@media (max-width: 1000px) {
		.shell {
			grid-template-columns: 200px minmax(0, 1fr);
			gap: 22px;
			padding: 16px;
		}
		.desktop-sidebar {
			padding: 22px 10px;
		}
		.sidebar-top {
			padding: 0 6px;
		}
		.trail-workspace {
			display: none;
		}
	}
	@media (max-width: 760px) {
		.shell {
			display: block;
			padding: 16px;
		}
		.desktop-sidebar {
			display: none;
		}
		.menu-btn {
			display: grid;
			width: 34px;
			height: 34px;
		}
		.topbar {
			margin-bottom: 24px;
		}
		.trail {
			gap: 10px;
		}
		.top-actions {
			gap: 12px;
		}
		.topbar .btn {
			min-height: 36px;
		}
		.workspace-footer {
			font-size: 9px;
		}
	}
</style>
