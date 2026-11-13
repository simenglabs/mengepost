<script lang="ts" module>
	// Static, trusted SVG markup (Lucide-style, 24px grid).
	const icons = {
		search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
		close: '<path d="m6 6 12 12M6 18 18 6"/>',
		list: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 8h9M8 12h9M8 16h6"/>',
		more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
		leaf: '<path d="M20 3C8 2 2 8 5 16c8 4 15-2 15-13Z"/><path d="M4 21 15 10"/>',
		shield:
			'<path d="m12 3 8 4v6c0 5-8 9-8 9s-8-4-8-9V7l8-4Z"/><path d="m8 12 3 3 5-5"/>',
		upload: '<path d="M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5"/>',
		sparkles:
			'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z"/>',
		dashboard:
			'<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
		kanban:
			'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 7v7M12 7v4M16 7v9"/>',
		calendar:
			'<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
		settings:
			'<path d="M20 7h-9M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/>',
		plus: '<path d="M12 5v14M5 12h14"/>',
		logout:
			'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
		arrow: '<path d="M7 17 17 7M7 7h10v10"/>',
		video:
			'<rect x="2" y="5" width="14" height="14" rx="2"/><path d="m22 8-6 4 6 4V8z"/>',
		clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
		check: '<path d="M20 6 9 17l-5-5"/>',
		alert: '<circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>',
		left: '<path d="m15 18-6-6 6-6"/>',
		right: '<path d="m9 18 6-6-6-6"/>',
		link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
		bulb: '<path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/>',
		edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
		send: '<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>',
		users:
			'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
		trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
		menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
	};
	export type IconName = keyof typeof icons;
</script>

<script lang="ts">
	let { name, size = 18 }: { name: IconName; size?: number } = $props();
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="1.8"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	{@html icons[name]}
</svg>
