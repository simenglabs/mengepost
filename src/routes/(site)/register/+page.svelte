<script lang="ts">
	import AuthFrame from '#lib/ui/AuthFrame.svelte';
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '$app/forms';
	import { site } from '#lib';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
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
	<title>Set up – {site.name}</title>
</svelte:head>

<AuthFrame setup
	><div class="auth">
		<h2>Make yourself at home.</h2>
		<p class="muted">
			Create the admin account for {site.name}. You can invite teammates later
			in Account Settings.
		</p>
		{#if form?.error}<p class="alert" role="alert">{form.error}</p>{/if}

		<form method="POST" use:enhance={submit}>
			<label class="field">
				Name
				<input
					class="input"
					name="name"
					value={form?.name ?? ''}
					autocomplete="name"
					required
				/>
			</label>
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
					minlength="8"
					autocomplete="new-password"
					required
				/>
				<small>At least 8 characters.</small>
			</label>
			<button class="btn primary" disabled={pending}
				>{pending
					? 'Preparing your workspace…'
					: 'Create your workspace'}</button
			>
		</form>
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
	.auth > p {
		font-size: 12px;
	}
	.auth h2 {
		font-weight: 450;
	}
	.auth .btn {
		margin-top: 5px;
	}
</style>
