<script lang="ts">
	let { href = '/', small = false }: { href?: string; small?: boolean } =
		$props();
</script>

<a {href} class="brand" class:small aria-label="mengepost home"
	><span class="mark"
		><svg
			width="21"
			height="21"
			viewBox="0 0 24 24"
			fill="none"
			aria-hidden="true"
			><path
				d="M7 8.5A6 6 0 1 1 6 15M7 8.5V4M7 8.5H2.5"
				stroke="currentColor"
				stroke-width="1.6"
				stroke-linecap="round"
				stroke-linejoin="round"
			/><path d="m11 9 4 3-4 3V9Z" fill="currentColor" /></svg
		></span
	><span>mengepost<span class="period">.</span></span></a
>

<style>
	.brand {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		color: var(--ink);
		text-decoration: none;
		font-size: 21px;
		font-weight: 600;
		letter-spacing: -1px;
	}
	.mark {
		width: 35px;
		height: 35px;
		border-radius: 11px;
		background: var(--primary);
		color: #f5faee;
		display: grid;
		place-items: center;
		box-shadow: inset 0 1px 1px #ffffff40;
	}
	.period {
		color: #8a9d78;
	}
	.small {
		font-size: 18px;
	}
	.small .mark {
		width: 31px;
		height: 31px;
		border-radius: 10px;
	}
</style>
