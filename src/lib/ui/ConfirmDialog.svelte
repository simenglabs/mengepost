<script lang="ts">
	let {
		open = $bindable(false),
		title,
		description,
		confirmLabel = 'Delete',
		onconfirm,
	}: {
		open?: boolean;
		title: string;
		description: string;
		confirmLabel?: string;
		onconfirm: () => void | Promise<void>;
	} = $props();
	let dialog: HTMLDialogElement;
	$effect(() => {
		if (!dialog) return;
		if (open && !dialog.open) dialog.showModal();
		else if (!open && dialog.open) dialog.close();
	});
</script>

<dialog
	bind:this={dialog}
	onclose={() => (open = false)}
	oncancel={() => (open = false)}
	aria-labelledby="confirm-title"
>
	<h2 id="confirm-title">{title}</h2>
	<p>{description}</p>
	<div class="dialog-actions">
		<button type="button" class="btn" onclick={() => (open = false)}
			>Cancel</button
		><button
			type="button"
			class="btn danger"
			onclick={() => {
				open = false;
				onconfirm();
			}}>{confirmLabel}</button
		>
	</div>
</dialog>
