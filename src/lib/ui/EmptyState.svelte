<script lang="ts">
	import Icon, { type IconName } from '#lib/Icon.svelte';
	let {
		title,
		description,
		icon = 'bulb',
		href,
		action,
	}: {
		title: string;
		description: string;
		icon?: IconName;
		href?: string;
		action?: string;
	} = $props();
</script>

<div class="empty-state">
	<div class="empty-icon"><Icon name={icon} size={22} /></div>
	<h3>{title}</h3>
	<p>{description}</p>
	{#if href && action}<a class="btn sm" {href}
			>{action}<Icon name="right" size={14} /></a
		>{/if}
</div>
