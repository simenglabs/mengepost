// Shared by client and server: keep pure (no `cloudflare:workers`, no `$app/*`) and erasable-only TypeScript.
export type Platform = 'tiktok' | 'youtube' | 'instagram' | 'threads' | 'x';
export type ContentKind = 'text' | 'image' | 'video';
export type Caps = { available: boolean; kinds: ContentKind[]; maxImages: number; maxCaption: number };
type Media = { kind: 'image' | 'video' }[];

export const PLATFORMS: Platform[] = ['tiktok', 'youtube', 'instagram', 'threads', 'x'];

export const platformLabel: Record<Platform, string> = {
	tiktok: 'TikTok',
	youtube: 'YouTube',
	instagram: 'Instagram',
	threads: 'Threads',
	x: 'X'
};

export const CAPS: Record<Platform, Caps> = {
	tiktok: { available: true, kinds: ['video'], maxImages: 0, maxCaption: 2200 },
	youtube: { available: true, kinds: ['video'], maxImages: 0, maxCaption: 5000 },
	instagram: { available: false, kinds: ['image', 'video'], maxImages: 10, maxCaption: 2200 },
	threads: { available: false, kinds: ['text', 'image', 'video'], maxImages: 20, maxCaption: 500 },
	x: { available: false, kinds: ['text', 'image', 'video'], maxImages: 4, maxCaption: 280 }
};

const YOUTUBE_MAX_DESCRIPTION_BYTES = 5000;

export function contentKind(media: Media): ContentKind {
	if (media.length === 0) return 'text';
	return media[0].kind === 'video' ? 'video' : 'image';
}

export function effectiveCaption(main: string, override: string | null): string {
	return override ?? main;
}

/** `ctx.caption` is the effective caption. Returns the first problem found, or null. */
export function platformIssue(p: Platform, ctx: { media: Media; caption: string }): string | null {
	const caps = CAPS[p];
	const label = platformLabel[p];
	if (!caps.available) return `${label} is coming soon.`;
	const kind = contentKind(ctx.media);
	if (!caps.kinds.includes(kind)) {
		return caps.kinds.length === 1 && caps.kinds[0] === 'video' ? `${label} needs a video.` : `${label} can't post ${kind} posts.`;
	}
	const images = ctx.media.filter((m) => m.kind === 'image').length;
	if (images > caps.maxImages && kind === 'image') return `${label} allows up to ${caps.maxImages} images.`;
	if (p === 'youtube') {
		// The YouTube Data API rejects descriptions with < or > and measures the limit in UTF-8 bytes.
		if (/[<>]/.test(ctx.caption)) return "YouTube descriptions can't contain < or >.";
		if (new TextEncoder().encode(ctx.caption).length > YOUTUBE_MAX_DESCRIPTION_BYTES)
			return `YouTube descriptions can be up to ${YOUTUBE_MAX_DESCRIPTION_BYTES} bytes.`;
		return null;
	}
	if (ctx.caption.length > caps.maxCaption) return `${label} captions can be up to ${caps.maxCaption} characters.`;
	return null;
}

export function defaultYouTubeTitle(caption: string): string {
	return caption.split('\n')[0].replace(/[<>]/g, '').trim().slice(0, 100);
}
