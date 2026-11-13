<script lang="ts">
	import AuthFrame from '#lib/ui/AuthFrame.svelte';
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '$app/forms';
	import { site } from '#lib';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let pending = $state(false);
	const submit: SubmitFunction = () => {
		pending = true;
		return async ({ update }) => {
			await update();
			pending = false;
		};
	};
</script>

<svelte:head>
	<title>Log in – {site.name}</title>
</svelte:head>

<AuthFrame
	><div class="auth">
		<h2>Your workspace awaits.</h2>
		<p class="muted">Log in to your {site.name} workspace.</p>

		{#if data.setup}
			<p class="alert info">
				No account exists yet. <a href="/register">Create the admin account</a> to
				get started.
			</p>
		{/if}
		{#if form?.error}<p class="alert" role="alert">{form.error}</p>{/if}

		<form method="POST" use:enhance={submit}>
			<label class="field">
				Email
				<input
					class="input"
					type="email"
					name="email"
					value={form?.email ?? ''}
					autocomplete="email"
					required
				/>
			</label>
			<label class="field">
				Password
				<input
					class="input"
					type="password"
					name="password"
					autocomplete="current-password"
					required
				/>
			</label>
			<button class="btn primary" disabled={pending}
				>{pending
					? 'Opening your workspace…'
					: 'Log in to your workspace'}</button
			>
		</form>
		<p class="small muted">
			Need access or a password reset? Contact your workspace admin.
		</p>
	</div></AuthFrame
>

<style>
	.auth {
		width: 100%;
	}
	h2 {
		margin: 0 0 4px;
		font-size: 24px;
	}
	form {
		display: flex;
		flex-direction: column;
		gap: 14px;
		margin-top: 20px;
	}
	.alert {
		margin: 16px 0 0;
	}
	.small {
		font-size: 13px;
		margin: 16px 0 0;
	}
	.auth > p {
		font-size: 12px;
	}
	.auth h2 {
		font-weight: 450;
	}
	.small {
		font-size: 11px !important;
		line-height: 1.8;
	}
	.auth .btn {
		margin-top: 5px;
	}
</style>
