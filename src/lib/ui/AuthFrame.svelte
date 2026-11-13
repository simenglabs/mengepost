<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from '#lib/Icon.svelte';
	let { children, setup = false }: { children: Snippet; setup?: boolean } =
		$props();
</script>

<div class="auth-layout">
	<div class="auth-story">
		<span class="eyebrow">A LITTLE SPACE FOR WHAT'S NEXT</span>
		<h1>
			{setup ? 'Good things start' : 'Welcome back'}<br />{setup
				? 'with a little space.'
				: 'to your flow.'}
		</h1>
		<p>
			Your ideas, your rhythm, your next post.<br />All together in a calmer
			creative space.
		</p>
		<div class="auth-art" aria-hidden="true">
			<div class="art-orbit one"></div>
			<div class="art-orbit two"></div>
			<div class="art-card glass">
				<span class="art-icon"><Icon name="leaf" size={25} /></span><strong
					>A little planning.<br />More room to create.</strong
				>
				<div class="art-bottom"><span></span>YOUR NEXT IDEA STARTS HERE</div>
			</div>
			<div class="floating-label glass">
				<Icon name="check" size={12} />A fresh start, every day.
			</div>
		</div>
	</div>
	<section class="auth-form card">{@render children()}</section>
</div>

<style>
	.auth-layout {
		max-width: 1000px;
		margin: 80px auto 90px;
		display: grid;
		grid-template-columns: 1fr 400px;
		gap: 90px;
		align-items: center;
	}
	.auth-story h1 {
		font-size: 43px;
		letter-spacing: -2px;
		font-weight: 430;
		line-height: 1.2;
		margin: 18px 0;
	}
	.auth-story > p {
		font-size: 12px;
		line-height: 1.9;
		color: #8a967e;
	}
	.auth-story > .eyebrow {
		font-size: 8px;
	}
	.auth-art {
		position: relative;
		max-width: 300px;
		height: 210px;
		margin-top: 35px;
	}
	.art-card {
		position: absolute;
		left: 25px;
		top: 20px;
		width: 210px;
		height: 155px;
		transform: rotate(-7deg);
		border-radius: 20px;
		padding: 22px;
		background: #ffffff80;
	}
	.art-icon {
		position: absolute;
		right: 20px;
		top: 20px;
		color: #8fa078;
	}
	.art-card strong {
		display: block;
		font-size: 18px;
		font-weight: 450;
		letter-spacing: -0.5px;
		line-height: 1.6;
		margin: 16px 0;
	}
	.art-bottom {
		font-size: 6px;
		letter-spacing: 0.1em;
		color: #9aa38b;
		display: flex;
		gap: 5px;
		align-items: center;
	}
	.art-bottom span {
		width: 4px;
		height: 4px;
		border-radius: 50%;
		background: #92a77d;
	}
	.floating-label {
		position: absolute;
		right: -15px;
		bottom: 13px;
		padding: 10px 14px;
		font-size: 8px;
		border-radius: 10px;
		display: flex;
		align-items: center;
		gap: 6px;
		transform: rotate(4deg);
		color: #859574;
	}
	.art-orbit {
		position: absolute;
		width: 160px;
		height: 160px;
		border-radius: 50%;
		filter: blur(15px);
		background: #dce7ccaa;
		top: 0;
		left: 0;
	}
	.art-orbit.two {
		background: #e4dce9aa;
		top: 40px;
		left: 130px;
	}
	.auth-form {
		padding: 34px;
		background: #ffffff9c;
		box-shadow: 0 15px 60px #4a5e3a06;
	}
	@media (max-width: 1050px) {
		.auth-layout {
			margin: 65px 40px;
			gap: 50px;
			grid-template-columns: 1fr 380px;
		}
		.auth-story h1 {
			font-size: 36px;
		}
	}
	@media (max-width: 760px) {
		.auth-layout {
			grid-template-columns: 1fr;
			max-width: 420px;
			margin: 50px auto 60px;
			padding: 0 20px;
			gap: 25px;
		}
		.auth-story {
			text-align: center;
		}
		.auth-story h1 {
			font-size: 32px;
		}
		.auth-story > p,
		.auth-art {
			display: none;
		}
		.auth-form {
			padding: 26px;
		}
	}
</style>
