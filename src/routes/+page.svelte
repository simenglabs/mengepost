<script lang="ts">
	import { site } from '#lib';
</script>

<svelte:head>
	<title>{site.name} – Schedule and publish to TikTok</title>
	<meta name="description" content="{site.name} lets creators schedule and publish videos to their TikTok account." />
</svelte:head>

<section class="hero">
	<h1>Schedule and publish your TikTok videos</h1>
	<p>
		{site.name} helps creators plan content ahead. Connect your TikTok account, upload a video,
		write your caption, pick a time, and {site.name} publishes it for you through the official
		TikTok Content Posting API.
	</p>
</section>

<h2>How it works</h2>
<ol>
	<li><strong>Connect</strong> – sign in with TikTok (Login Kit). We never see your password.</li>
	<li><strong>Upload</strong> – add your video, caption and hashtags.</li>
	<li>
		<strong>Review</strong> – preview the post and choose privacy level and whether comments, duets
		and stitches are allowed.
	</li>
	<li><strong>Publish</strong> – post now or schedule it for later.</li>
</ol>

<h2>Your control</h2>
<p>
	You can disconnect {site.name} at any time from your TikTok settings or from inside the app.
	Read our <a href="/privacy">Privacy Policy</a> and <a href="/terms">Terms of Service</a>.
</p>

<style>
	.hero {
		padding-block: 24px 8px;
	}
	h1 {
		font-size: clamp(1.8rem, 5vw, 2.6rem);
		line-height: 1.2;
		margin: 0 0 16px;
	}
</style>
