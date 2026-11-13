<script lang="ts">
	import { site } from '#lib';
</script>

<svelte:head>
	<title>Terms of Service – {site.name}</title>
</svelte:head>

<h1>Terms of Service</h1>
<p><em>Last updated: {site.updated}</em></p>

<p>
	These Terms govern your use of {site.name} ("the Service"), operated by {site.company}. By using
	the Service you agree to these Terms.
</p>

<h2>1. The Service</h2>
<p>
	{site.name} lets you connect your TikTok account and upload, schedule and publish content to it
	using the TikTok Content Posting API.
</p>

<h2>2. Your account</h2>
<p>
	You must be at least 18 years old (or the age of majority where you live) and comply with
	<a href="https://www.tiktok.com/legal/terms-of-service" target="_blank" rel="noopener">TikTok's Terms of Service</a>
	and
	<a href="https://www.tiktok.com/community-guidelines" target="_blank" rel="noopener">Community Guidelines</a>.
	You are responsible for activity performed through your connected account.
</p>

<h2>3. Your content</h2>
<p>
	You keep all rights to the content you upload. You grant us a limited license to store and
	transmit it solely to publish it to TikTok on your behalf. You confirm you have the rights to
	everything you post, including music, and that it does not violate any law or third-party right.
</p>

<h2>4. Prohibited use</h2>
<ul>
	<li>Posting spam, misleading, illegal or infringing content.</li>
	<li>Using the Service to access accounts you do not own or are not authorized to manage.</li>
	<li>Attempting to disrupt, reverse engineer or abuse the Service or TikTok's platform.</li>
</ul>

<h2>5. Third-party services</h2>
<p>
	The Service depends on TikTok. We are not affiliated with or endorsed by TikTok, and we are not
	responsible for TikTok's availability, decisions or policies.
</p>

<h2>6. Termination</h2>
<p>
	You may stop using the Service and disconnect your account at any time. We may suspend access if
	you violate these Terms.
</p>

<h2>7. Disclaimer and liability</h2>
<p>
	The Service is provided "as is" without warranties. To the extent permitted by law, {site.company}
	is not liable for indirect or consequential damages, including failed or delayed posts.
</p>

<h2>8. Changes</h2>
<p>We may update these Terms. Continued use after changes means you accept them.</p>

<h2>9. Contact</h2>
<p>Questions: <a href="mailto:{site.email}">{site.email}</a></p>
