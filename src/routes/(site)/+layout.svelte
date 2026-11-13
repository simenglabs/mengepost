<script lang="ts">
	import { site } from '#lib';
	import Brand from '#lib/ui/Brand.svelte';
	import Icon from '#lib/Icon.svelte';
	import { page } from '$app/state';
	import type { LayoutProps } from './$types';
	let { children }: LayoutProps = $props();
	let menuOpen = $state(false);
	const home = $derived(page.url.pathname === '/');
	$effect(() => {
		page.url.pathname;
		menuOpen = false;
	});
</script>

<a class="skip-link" href="#site-content">Skip to content</a>
<div class="nav-wrap">
	<header class="site-nav glass">
		<Brand />
		<nav aria-label="Main navigation">
			<a href="/#features">The workspace</a><a href="/#how-it-works"
				>How it works</a
			><a href="/#faq">A few questions</a>
		</nav>
		<a href="/login" class="btn primary sm nav-cta"
			>Open workspace<Icon name="arrow" size={13} /></a
		><button
			class="icon-btn mobile-menu"
			aria-label="Toggle navigation"
			aria-expanded={menuOpen}
			onclick={() => (menuOpen = !menuOpen)}
			><Icon name={menuOpen ? 'close' : 'menu'} size={18} /></button
		>
	</header>
	{#if menuOpen}<nav class="mobile-links glass" aria-label="Mobile navigation">
			<a href="/#features" onclick={() => (menuOpen = false)}>The workspace</a
			><a href="/#how-it-works" onclick={() => (menuOpen = false)}
				>How it works</a
			><a href="/#faq" onclick={() => (menuOpen = false)}>A few questions</a><a
				href="/login">Open workspace<Icon name="arrow" size={14} /></a
			>
		</nav>{/if}
</div>
<main
	id="site-content"
	class:legal={!home && !['/login', '/register'].includes(page.url.pathname)}
>
	{@render children()}
</main>
<footer class="site-footer">
	<div class="footer-top">
		<div>
			<Brand />
			<p>A little planning. More room to create.</p>
		</div>
		<a href="mailto:{site.email}" class="footer-email"
			>Say hello<Icon name="arrow" size={14} /></a
		>
	</div>
	<div class="footer-bottom">
		<span>© {new Date().getFullYear()} {site.company}. Thoughtfully made.</span
		>
		<div>
			<a href="/terms">Terms</a><a href="/privacy">Privacy</a><a
				href="mailto:{site.email}">Contact</a
			>
		</div>
	</div>
</footer>

<style>
	.nav-wrap {
		position: sticky;
		top: 16px;
		z-index: 30;
		max-width: 1152px;
		margin: 20px auto 0;
		padding: 0 24px;
	}
	.site-nav {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 20px;
		border-radius: 19px;
		padding: 13px 18px;
		background: #f9fbf4b3;
	}
	.site-nav nav {
		display: flex;
		align-items: center;
		gap: 28px;
	}
	.site-nav nav a {
		font-size: 11px;
		text-decoration: none;
		color: var(--muted);
	}
	.site-nav nav a:hover {
		color: var(--primary);
	}
	.nav-cta {
		font-size: 10px;
		border-radius: 10px;
	}
	.mobile-menu {
		display: none;
	}
	.mobile-links {
		display: flex;
		flex-direction: column;
		padding: 12px 18px;
		margin-top: 8px;
		border-radius: 16px;
		background: #f9fbf4f2;
	}
	.mobile-links a {
		display: flex;
		justify-content: space-between;
		padding: 12px 0;
		text-decoration: none;
		font-size: 13px;
	}
	.site-footer {
		max-width: 1104px;
		padding: 48px 0 24px;
		margin: 0 auto;
	}
	.footer-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
		padding-bottom: 40px;
	}
	.footer-top p {
		font-size: 11px;
		color: var(--muted);
		margin: 12px 0 0;
	}
	.footer-email {
		display: flex;
		gap: 8px;
		align-items: center;
		font-size: 12px;
		text-decoration: none;
	}
	.footer-bottom {
		display: flex;
		justify-content: space-between;
		gap: 20px;
		border-top: 1px solid var(--line);
		padding-top: 23px;
		font-size: 10px;
		color: var(--muted);
	}
	.footer-bottom > div {
		display: flex;
		gap: 22px;
	}
	.footer-bottom a {
		color: var(--muted);
		text-decoration: none;
	}
	.legal {
		max-width: 760px;
		margin: 70px auto;
		padding: 36px;
		background: #ffffff9e;
		border: 1px solid white;
		border-radius: 24px;
	}
	.legal :global(h1) {
		font-size: 34px;
	}
	.legal :global(h2) {
		font-size: 19px;
		margin-top: 32px;
	}
	.legal :global(p),
	.legal :global(li) {
		font-size: 13px;
		color: #697666;
		line-height: 1.9;
	}
	@media (max-width: 1152px) {
		.site-footer {
			margin: 0 24px;
		}
	}
	@media (max-width: 760px) {
		.nav-wrap {
			padding: 0 16px;
			top: 12px;
			margin-top: 12px;
		}
		.site-nav {
			padding: 12px;
			gap: 10px;
		}
		.site-nav nav {
			display: none;
		}
		.site-nav :global(.brand) {
			font-size: 18px;
		}
		.site-nav :global(.mark) {
			width: 31px;
			height: 31px;
		}
		.nav-cta {
			margin-left: auto;
			font-size: 10px;
			min-height: 34px;
			padding: 8px 10px;
		}
		.mobile-menu {
			display: grid;
			width: 34px;
			height: 34px;
			border: 0;
			background: transparent;
		}
		.site-footer {
			margin: 0 20px;
			padding-top: 30px;
		}
		.footer-bottom {
			flex-direction: column;
			gap: 14px;
		}
		.legal {
			margin: 40px 16px;
			padding: 24px;
		}
		.footer-top {
			align-items: flex-start;
		}
		.footer-top p {
			max-width: 190px;
		}
	}
	@media (max-width: 370px) {
		.nav-cta {
			font-size: 9px;
		}
		.nav-cta :global(svg) {
			display: none;
		}
	}
</style>
