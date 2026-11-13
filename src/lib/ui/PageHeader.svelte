<script lang="ts">
	import type { Snippet } from 'svelte';
	let {
		title,
		description = '',
		eyebrow = 'Your workspace',
		actions,
	}: {
		title: string;
		description?: string;
		eyebrow?: string;
		actions?: Snippet;
	} = $props();
</script>

<div class="page-head">
	<div>
		<span class="eyebrow">{eyebrow}</span>
		<h1>{title}</h1>
		{#if description}<p>{description}</p>{/if}
	</div>
	{#if actions}<div class="page-actions">{@render actions()}</div>{/if}
</div>
