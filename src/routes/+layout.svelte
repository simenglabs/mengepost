<script lang="ts">
	import favicon from '#lib/assets/favicon.svg';
	import { site } from '#lib';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<header>
	<a href="/" class="brand">{site.name}</a>
	<nav>
		<a href="/terms">Terms</a>
		<a href="/privacy">Privacy</a>
	</nav>
</header>

<main>
	{@render children()}
</main>

<footer>
	© {new Date().getFullYear()} {site.company} · <a href="mailto:{site.email}">{site.email}</a>
</footer>

<style>
	:global(:root) {
		--bg: #ffffff;
		--fg: #1a1a1a;
		--muted: #666;
		--accent: #fe2c55;
		--line: #e5e5e5;
		color-scheme: light dark;
	}
	@media (prefers-color-scheme: dark) {
		:global(:root) {
			--bg: #111;
			--fg: #eee;
			--muted: #999;
			--line: #2a2a2a;
		}
	}
	:global(body) {
		margin: 0;
		background: var(--bg);
		color: var(--fg);
		font: 16px/1.65 system-ui, sans-serif;
	}
	:global(a) {
		color: var(--accent);
	}
	header,
	main,
	footer {
		max-width: 760px;
		margin: 0 auto;
		padding: 0 16px;
	}
	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-block: 20px;
		border-bottom: 1px solid var(--line);
	}
	.brand {
		font-weight: 700;
		font-size: 1.2rem;
		color: var(--fg);
		text-decoration: none;
	}
	nav a {
		margin-left: 16px;
		color: var(--fg);
	}
	main {
		padding-block: 32px;
	}
	footer {
		padding-block: 24px;
		border-top: 1px solid var(--line);
		color: var(--muted);
		font-size: 0.9rem;
	}
</style>
