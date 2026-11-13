<script lang="ts">
	import { site } from '#lib';
</script>

<svelte:head>
	<title>Privacy Policy – {site.name}</title>
</svelte:head>

<h1>Privacy Policy</h1>
<p><em>Last updated: {site.updated}</em></p>

<p>
	This policy explains what data {site.name}, operated by {site.company}, collects when you use the
	Service and how we use it.
</p>

<h2>1. Data we collect</h2>
<ul>
	<li>
		<strong>TikTok account data</strong> (via TikTok Login Kit): your open ID, display name and
		avatar.
	</li>
	<li><strong>Access tokens</strong> issued by TikTok so we can publish on your behalf.</li>
	<li>
		<strong>Content you upload</strong>: videos or photos, captions, hashtags, privacy and
		interaction settings, and scheduled times.
	</li>
	<li><strong>Basic technical logs</strong> (e.g. request time, errors) to keep the Service running.</li>
</ul>
<p>We do not collect your TikTok password.</p>

<h2>2. How we use it</h2>
<ul>
	<li>To publish content to your TikTok account when you request it.</li>
	<li>To show your account and post status inside the app.</li>
	<li>To troubleshoot problems and prevent abuse.</li>
</ul>
<p>We do not sell your data and do not use it for advertising.</p>

<h2>3. Sharing</h2>
<p>
	Your content is sent to TikTok to be published. We use hosting/storage providers to run the
	Service. We do not share your data with anyone else unless required by law.
</p>

<h2>4. Storage and retention</h2>
<ul>
	<li>Uploaded media is deleted from our servers after it is successfully published, or within 30 days.</li>
	<li>Access tokens are stored encrypted and deleted when you disconnect your account.</li>
	<li>Account data is deleted within 30 days after you disconnect or request deletion.</li>
</ul>

<h2>5. Your choices</h2>
<ul>
	<li>
		Revoke access anytime in TikTok: Settings and privacy → Security → Manage app permissions,
		or disconnect from inside {site.name}.
	</li>
	<li>
		Request access to or deletion of your data by emailing
		<a href="mailto:{site.email}">{site.email}</a>.
	</li>
</ul>

<h2>6. Security</h2>
<p>We use HTTPS and encrypted storage for tokens, and limit access to authorized personnel.</p>

<h2>7. Children</h2>
<p>The Service is not intended for anyone under 18.</p>

<h2>8. Changes</h2>
<p>We will post updates on this page and change the "Last updated" date.</p>

<h2>9. Contact</h2>
<p><a href="mailto:{site.email}">{site.email}</a></p>
