<script lang="ts">
	import { page } from '$app/state';
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '$app/forms';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import ConfirmDialog from '#lib/ui/ConfirmDialog.svelte';
	import { site } from '#lib';
	import Icon from '#lib/Icon.svelte';
	import { platformLabel, type Platform } from '#lib/platforms.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let tab = $state('profile');
	let pending = $state(false);
	let showPassword = $state(false);
	let disconnectOpen = $state(false);
	let disconnectForm = $state<HTMLFormElement>();
	let ytDisconnectOpen = $state(false);
	let ytDisconnectForm = $state<HTMLFormElement>();
	$effect(() => {
		const hash = page.url.hash.slice(1);
		// #tiktok / #youtube come back from the OAuth callbacks.
		if (['tiktok', 'youtube', 'connections'].includes(hash)) tab = 'connections';
		else if (['profile', 'security', 'team'].includes(hash)) tab = hash;
	});
	const submit: SubmitFunction = () => {
		pending = true;
		return async ({ update, result }) => {
			await update({ reset: result.type === 'success' });
			pending = false;
		};
	};

	const soon: { platform: Platform; text: string }[] = [
		{ platform: 'instagram', text: 'Share photos, carousels and Reels. Business and Creator accounts only.' },
		{ platform: 'threads', text: 'Post short text updates, images and video to Threads.' },
		{ platform: 'x', text: 'Publish text, images and video to X.' }
	];
	const msg = (section: string) => (form?.section === section ? form : null);
	const tiktokOk = $derived(
		page.url.searchParams.get('tiktok') === 'connected',
	);
	const tiktokError = $derived(page.url.searchParams.get('tiktok_error'));
	const youtubeOk = $derived(
		page.url.searchParams.get('youtube') === 'connected',
	);
	const youtubeError = $derived(page.url.searchParams.get('youtube_error'));
	const date = (ms: number) =>
		new Date(ms).toLocaleDateString(undefined, {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
		});
</script>

<svelte:head>
	<title>Account Settings – {site.name}</title>
</svelte:head>

<PageHeader
	title="A space that feels like yours."
	description="Your profile, connections, and the people you create with."
	eyebrow="Workspace settings"
/>
<nav class="settings-tabs segmented" aria-label="Settings sections">
	{#each [{ key: 'profile', label: 'Profile' }, { key: 'connections', label: 'Connections' }, { key: 'security', label: 'Security' }, ...(data.user.role === 'admin' ? [{ key: 'team', label: 'Team' }] : [])] as item}<button
			class:active={tab === item.key}
			onclick={() => (tab = item.key)}>{item.label}</button
		>{/each}
</nav>
{#if pending}<p class="saving-message" role="status">
		Saving your changes…
	</p>{/if}
<div class="grid">
	<div class="connections" hidden={tab !== 'connections'}>
	<section class="card tiktok" id="tiktok">
		<div class="card-head">
			<h2 class="card-title">TikTok account</h2>
			{#if data.account}<span class="pill published"
					><Icon name="check" size={12} /> Connected</span
				>{/if}
		</div>

		{#if tiktokOk}<p class="alert ok" role="status">
				TikTok account connected.
			</p>{/if}
		{#if tiktokError}<p class="alert" role="alert">{tiktokError}</p>{/if}
		{#if msg('tiktok')?.ok}<p class="alert ok" role="status">
				{msg('tiktok')?.ok}
			</p>{/if}

		{#if data.account}
			<div class="who">
				<img class="avatar lg" src={data.account.avatar_url} alt="" />
				<div>
					<strong>{data.account.display_name}</strong>
					<small class="muted"
						>Connected {date(data.account.connected_at)}</small
					>
				</div>
			</div>
			<p class="muted small">
				{site.name} can publish videos to this account, including scheduled posts.
				{#if data.account.refresh_expires_at}The connection stays valid until
					{date(data.account.refresh_expires_at)}; reconnect before then to keep
					scheduling.{/if}
			</p>
			<div class="actions">
				<a href="/app/settings/tiktok" class="btn" data-sveltekit-reload
					>Reconnect</a
				>
				<form
					method="POST"
					action="?/disconnect"
					use:enhance={submit}
					bind:this={disconnectForm}
				>
					<button
						class="btn danger"
						type="button"
						disabled={pending}
						onclick={() => (disconnectOpen = true)}>Disconnect</button
					>
				</form>
			</div>
		{:else}
			<div class="connect">
				<div class="connect-ico"><Icon name="link" size={22} /></div>
				<div>
					<strong>Connect your TikTok account</strong>
					<p class="muted small">
						You'll be asked to allow {site.name} to read your basic profile (avatar
						and display name) and to post content to TikTok. We never see your password.
					</p>
				</div>
			</div>
			<a href="/app/settings/tiktok" class="btn dark" data-sveltekit-reload
				>Continue with TikTok</a
			>
		{/if}
	</section>

	<section class="card youtube" id="youtube">
		<div class="card-head">
			<h2 class="card-title">YouTube channel</h2>
			{#if data.youtube}<span class="pill published"
					><Icon name="check" size={12} /> Connected</span
				>{/if}
		</div>

		{#if youtubeOk}<p class="alert ok" role="status">
				YouTube channel connected.
			</p>{/if}
		{#if youtubeError}<p class="alert" role="alert">{youtubeError}</p>{/if}
		{#if msg('youtube')?.ok}<p class="alert ok" role="status">
				{msg('youtube')?.ok}
			</p>{/if}

		{#if data.youtube}
			<div class="who">
				{#if data.youtube.avatar_url}<img
						class="avatar lg"
						src={data.youtube.avatar_url}
						alt=""
						referrerpolicy="no-referrer"
					/>{/if}
				<div>
					<strong>{data.youtube.display_name}</strong>
					<small class="muted"
						>Connected {date(data.youtube.connected_at)}</small
					>
				</div>
			</div>
			<p class="muted small">
				{site.name} can upload videos to this channel.
				{#if data.youtube.refresh_expires_at}The connection stays valid until
					{date(data.youtube.refresh_expires_at)}; reconnect before then to keep
					scheduling.{/if}
			</p>
			<div class="actions">
				<a href="/app/settings/youtube" class="btn" data-sveltekit-reload
					>Reconnect</a
				>
				<form
					method="POST"
					action="?/disconnectYouTube"
					use:enhance={submit}
					bind:this={ytDisconnectForm}
				>
					<button
						class="btn danger"
						type="button"
						disabled={pending}
						onclick={() => (ytDisconnectOpen = true)}>Disconnect</button
					>
				</form>
			</div>
		{:else}
			<div class="connect">
				<div class="connect-ico"><Icon name="link" size={22} /></div>
				<div>
					<strong>Connect your YouTube channel</strong>
					<p class="muted small">
						You'll sign in with Google and allow {site.name} to view your channel
						(name and picture) and to upload videos to it. We never see your password.
					</p>
				</div>
			</div>
			<a href="/app/settings/youtube" class="btn dark" data-sveltekit-reload
				>Continue with YouTube</a
			>
		{/if}
	</section>

	{#each soon as s (s.platform)}
		<section class="card soon" id={s.platform}>
			<div class="card-head">
				<h2 class="card-title">{platformLabel[s.platform]}</h2>
				<span class="pill">Coming soon</span>
			</div>
			<p class="muted small">{s.text}</p>
		</section>
	{/each}
	</div>

	<section class="card" hidden={tab !== 'profile'}>
		<div class="card-head"><h2 class="card-title">Profile</h2></div>
		{#if msg('profile')?.error}<p class="alert" role="alert">
				{msg('profile')?.error}
			</p>{/if}
		{#if msg('profile')?.ok}<p class="alert ok" role="status">
				{msg('profile')?.ok}
			</p>{/if}
		<form method="POST" use:enhance={submit} action="?/profile" class="stack">
			<label class="field"
				>Name <input
					class="input"
					autocomplete="name"
					name="name"
					value={data.user.name}
					required
				/></label
			>
			<label class="field"
				>Email <input
					class="input"
					type="email"
					autocomplete="email"
					name="email"
					value={data.user.email}
					required
				/></label
			>
			<button class="btn primary" disabled={pending}>Save profile</button>
		</form>
	</section>

	<section class="card" hidden={tab !== 'security'}>
		<div class="card-head"><h2 class="card-title">Password</h2></div>
		{#if msg('password')?.error}<p class="alert" role="alert">
				{msg('password')?.error}
			</p>{/if}
		{#if msg('password')?.ok}<p class="alert ok" role="status">
				{msg('password')?.ok}
			</p>{/if}
		<form method="POST" use:enhance={submit} action="?/password" class="stack">
			<label class="field"
				>Current password <input
					class="input"
					type="password"
					name="current"
					autocomplete="current-password"
					required
				/></label
			>
			<label class="field">
				New password
				<input
					class="input"
					type="password"
					name="next"
					minlength="8"
					autocomplete="new-password"
					required
				/>
				<small>At least 8 characters.</small>
			</label>
			<button class="btn primary" disabled={pending}>Change password</button>
		</form>
	</section>

	{#if data.user.role === 'admin'}
		<section class="card team" hidden={tab !== 'team'}>
			<div class="card-head">
				<h2 class="card-title">Team</h2>
				<span class="pill"
					>{data.team.length} {data.team.length === 1 ? 'user' : 'users'}</span
				>
			</div>
			{#if msg('team')?.error}<p class="alert" role="alert">
					{msg('team')?.error}
				</p>{/if}
			{#if msg('team')?.ok}<p class="alert ok" role="status">
					{msg('team')?.ok}
				</p>{/if}

			<ul class="people">
				{#each data.team as u (u.id)}
					<li>
						<span class="avatar">{u.name[0]?.toUpperCase()}</span>
						<span class="grow">
							<strong>{u.name}</strong>
							<small class="muted">{u.email}</small>
						</span>
						<span class="pill {u.role === 'admin' ? '' : 'draft'}"
							>{u.role}</span
						>
						{#if u.id !== data.user.id}
							<form
								method="POST"
								use:enhance={submit}
								action="?/removeUser"
								onsubmit={(e) => {
									if (
										!confirm(
											`Remove ${u.name}? Their posts and stored videos are deleted.`,
										)
									)
										e.preventDefault();
								}}
							>
								<input type="hidden" name="id" value={u.id} />
								<button class="btn ghost sm" aria-label="Remove {u.name}"
									><Icon name="trash" size={16} /></button
								>
							</form>
						{/if}
					</li>
				{/each}
			</ul>

			<form method="POST" use:enhance={submit} action="?/addUser" class="add">
				<h3 class="card-title">Add user</h3>
				<div class="row">
					<label class="field"
						>Name <input class="input" name="name" required /></label
					>
					<label class="field"
						>Email <input
							class="input"
							type="email"
							name="email"
							required
						/></label
					>
				</div>
				<div class="row">
					<label class="field">
						Temporary password
						<div class="password-control">
							<input
								class="input"
								type={showPassword ? 'text' : 'password'}
								name="password"
								minlength="8"
								autocomplete="new-password"
								required
							/><button
								type="button"
								class="btn ghost sm"
								aria-pressed={showPassword}
								onclick={() => (showPassword = !showPassword)}
								>{showPassword ? 'Hide' : 'Show'}</button
							>
						</div>
						<small>Share it with them; they can change it here.</small>
					</label>
					<label class="field">
						Role
						<select class="input" name="role">
							<option value="member">Member</option>
							<option value="admin">Admin</option>
						</select>
					</label>
				</div>
				<button class="btn dark" disabled={pending}
					><Icon name="plus" size={16} /> Add user</button
				>
			</form>
		</section>
	{/if}
</div>

<ConfirmDialog
	bind:open={disconnectOpen}
	title="Disconnect TikTok?"
	description="Scheduled posts cannot publish while your account is disconnected. Reconnect your account before their scheduled time."
	confirmLabel="Disconnect"
	onconfirm={() => disconnectForm?.requestSubmit()}
/>

<ConfirmDialog
	bind:open={ytDisconnectOpen}
	title="Disconnect YouTube?"
	description="Mengepost will no longer be able to upload to this channel until you reconnect it."
	confirmLabel="Disconnect"
	onconfirm={() => ytDisconnectForm?.requestSubmit()}
/>

<style>
	.grid {
		display: grid;
		grid-template-columns: minmax(0, 700px);
		gap: 16px;
		align-items: start;
	}
	.team {
		grid-column: 1 / -1;
	}
	/* Connections: two cards per row, wider than the single-column sections. */
	.grid:has(.connections:not([hidden])) {
		grid-template-columns: minmax(0, 1040px);
	}
	.connections {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 20px;
		align-items: stretch;
	}
	.connections[hidden] {
		display: none;
	}
	.connections .card {
		display: flex;
		flex-direction: column;
		gap: 16px;
		margin: 0;
	}
	.connections .card > :global(*) {
		margin-top: 0;
		margin-bottom: 0;
	}
	.connections .actions,
	.connections .card > .btn {
		margin-top: auto;
	}
	.connections .card > .btn {
		align-self: flex-start;
	}
	@media (max-width: 800px) {
		.connections {
			grid-template-columns: 1fr;
			gap: 16px;
		}
	}
	.alert {
		margin: 0 0 14px;
	}
	.stack {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	.stack .btn {
		align-self: flex-start;
	}
	.who {
		display: flex;
		align-items: center;
		gap: 14px;
	}
	.who strong {
		display: block;
		font-size: 18px;
	}
	.avatar.lg {
		width: 56px;
		height: 56px;
	}
	.small {
		font-size: 14px;
	}
	.actions {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
	}
	.connect {
		display: flex;
		gap: 14px;
		align-items: flex-start;
		margin-bottom: 14px;
	}
	.connect p {
		margin: 4px 0 0;
	}
	.connect-ico {
		display: grid;
		place-items: center;
		width: 48px;
		height: 48px;
		flex: none;
		border-radius: 14px;
		background: var(--primary);
		color: #fff;
	}
	.people {
		list-style: none;
		margin: 0 0 20px;
		padding: 0;
		display: flex;
		flex-direction: column;
	}
	.people li {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 0;
		border-bottom: 1px solid var(--line);
	}
	.people small {
		display: block;
		font-size: 13px;
	}
	.grow {
		flex: 1;
		min-width: 0;
	}
	.add {
		display: flex;
		flex-direction: column;
		gap: 14px;
		padding: 16px;
		border-radius: var(--radius);
		background: var(--tile);
	}
	.add h3 {
		margin: 0;
	}
	.add .row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
	}
	.add .btn {
		align-self: flex-start;
	}
	@media (max-width: 800px) {
		.grid,
		.add .row {
			grid-template-columns: 1fr;
		}
	}
	.settings-tabs {
		margin-bottom: 24px;
		max-width: 100%;
		overflow-x: auto;
	}
	.settings-tabs button {
		white-space: nowrap;
	}
	.grid {
		gap: 0;
	}
	.grid section[hidden] {
		display: none;
	}
	.card-head {
		padding-bottom: 18px;
		border-bottom: 1px solid var(--line);
	}
	.card-title {
		font-size: 17px;
		font-weight: 500;
	}
	.saving-message {
		font-size: 12px;
		color: var(--muted);
	}
	.password-control {
		display: flex;
		gap: 5px;
	}
	.password-control input {
		min-width: 0;
	}
	.people small {
		overflow-wrap: anywhere;
	}
	.team .add {
		background: #f0f3eb;
	}
	.who strong {
		font-weight: 450;
	}
	.connect-ico {
		background: var(--primary-soft);
		color: var(--primary);
	}
	@media (max-width: 480px) {
		.settings-tabs {
			display: flex;
		}
		.settings-tabs button {
			font-size: 11px;
			padding: 9px 10px;
		}
		.people li {
			gap: 8px;
		}
		.people strong {
			font-size: 12px;
		}
		.people small {
			font-size: 10px;
		}
		.people .pill {
			font-size: 9px;
		}
	}
</style>
