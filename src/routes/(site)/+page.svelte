<script lang="ts">
	import { site } from '#lib';
	import Icon from '#lib/Icon.svelte';
	import ProductPreview from '#lib/ui/ProductPreview.svelte';
	const faqs = [
		{
			q: 'What can I do with mengepost?',
			a: 'Capture content ideas, develop drafts, upload videos, and publish to TikTok and YouTube now or at a scheduled time. Instagram, Threads, and X are coming soon. Your board and calendar keep the whole process in view.',
		},
		{
			q: 'How do I connect my accounts?',
			a: 'Open Settings → Connections in your workspace and choose the platform you want to connect, TikTok or YouTube. The platform asks you to approve profile and posting access. mengepost never sees your TikTok or Google password.',
		},
		{
			q: 'Can I choose who sees my videos?',
			a: 'Yes. Before publishing, choose from the privacy options available for each connected account, such as TikTok privacy levels or YouTube visibility. You can also manage comments, duets, stitches, content disclosures, and the YouTube made-for-kids setting.',
		},
		{
			q: 'What happens to my uploaded videos?',
			a: 'Videos are stored while you prepare and schedule them. Once every platform you chose has published it, the video file is removed from mengepost storage. You can also delete a post and its stored video yourself.',
		},
		{
			q: 'How do I get access to a workspace?',
			a: 'Accounts are created by your workspace administrator. If you already have an account, choose Open workspace to log in. On a fresh installation, the first account sets up the workspace.',
		},
	];
</script>

<svelte:head
	><title>{site.name} — A calmer space for your next post</title><meta
		name="description"
		content="A little planning. More room to create. Capture ideas, plan your calendar, and publish to TikTok and YouTube from one calm workspace."
	/></svelte:head
>
<section class="hero">
	<div class="hero-glow" aria-hidden="true"></div>
	<span class="intro-label"
		><span></span>A LITTLE LESS BUSY. A LOT MORE CREATIVE.</span
	>
	<h1>A calmer space<br />for your <em>next post.</em></h1>
	<p>
		Your ideas deserve a little room to grow. Plan, prepare, and<br
			class="desktop-break"
		/> publish to TikTok and YouTube — all in one thoughtful workspace.
	</p>
	<div class="hero-actions">
		<a href="/login" class="btn primary"
			>Find your flow<Icon name="arrow" size={16} /></a
		><a href="#workspace-preview" class="explore-link"
			>Take a little look<Icon name="right" size={14} /></a
		>
	</div>
	<div class="hero-note">
		<Icon name="leaf" size={12} />Made for creators. Designed for breathing
		room.
	</div>
	<div class="hero-preview" id="workspace-preview"><ProductPreview /></div>
	<div class="preview-caption">
		<span>A home for your ideas, from the first spark to the final post.</span
		><span><i></i>ONE CONNECTED WORKSPACE</span>
	</div>
</section>
<section class="flow-section section" id="how-it-works">
	<div class="section-intro">
		<span class="eyebrow">FROM A SMALL SPARK TO SOMETHING SHARED</span>
		<h2>A natural flow.<br />At your own pace.</h2>
		<p>
			Keep the moving parts together.<br />Leave a little more space for the
			good part.
		</p>
	</div>
	<div class="flow-steps">
		{#each [{ n: '01', icon: 'bulb' as const, title: 'Catch the thought.', text: 'Save a passing idea before it passes. Your board gives every little spark a home.', color: 'lavender' }, { n: '02', icon: 'edit' as const, title: 'Make it your own.', text: 'Bring your video, caption, and details together. Refine it until it feels right.', color: 'peach' }, { n: '03', icon: 'calendar' as const, title: 'Give it a moment.', text: 'Choose a time on your calendar. See what’s coming, with room to adjust.', color: 'sky' }, { n: '04', icon: 'send' as const, title: 'Let it out there.', text: 'Publish now or let your schedule take over. Follow its progress in your workspace.', color: 'sage' }] as step}<article
				class="flow-step"
			>
				<div class="step-top">
					<span class="step-icon {step.color}"
						><Icon name={step.icon} size={20} /></span
					><span>{step.n}</span>
				</div>
				<h3>{step.title}</h3>
				<p>{step.text}</p>
			</article>{/each}
	</div>
</section>
<section class="features-section section" id="features">
	<div class="feature-heading">
		<div>
			<span class="eyebrow">A THOUGHTFUL LITTLE TOOLKIT</span>
			<h2>Less juggling.<br />More making.</h2>
		</div>
		<p>
			Everything you need to keep creating,<br />with a place for everything
			along the way.
		</p>
	</div>
	<div class="feature-grid">
		<article class="feature-board">
			<div>
				<span class="feature-kicker"
					><Icon name="kanban" size={16} />THE BOARD</span
				>
				<h3>See your ideas<br />find their shape.</h3>
				<p>
					From a rough thought to a ready-to-go post.<br />A visual board that
					moves with you.
				</p>
			</div>
			<div class="board-art" aria-hidden="true">
				<div class="floating-card back">
					<span class="dot lavender"></span><small>IDEA</small><strong
						>Something worth sharing.</strong
					><span class="art-line"></span><span class="art-line short"></span>
				</div>
				<div class="floating-card front">
					<div class="mini-image"><span></span></div>
					<span class="dot sage"></span><small>TAKING SHAPE</small><strong
						>A little closer to ready.</strong
					><span class="tiny-pill">Draft</span>
				</div>
			</div>
		</article>
		<article class="feature-calendar">
			<span class="feature-kicker"
				><Icon name="calendar" size={16} />THE CALENDAR</span
			>
			<h3>A little perspective<br />on what's ahead.</h3>
			<p>Your publishing rhythm, at a glance.</p>
			<div class="calendar-art" aria-hidden="true">
				<div class="calendar-art-title">
					A week with room to breathe.<Icon name="leaf" size={15} />
				</div>
				<div class="week-art">
					{#each ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as d, i}<div>
							<span>{d}</span><b class:chosen={i === 2}>{12 + i}</b><i
								class:planned={[0, 2, 4].includes(i)}
							></i>
						</div>{/each}
				</div>
				<div class="schedule-sample">
					<span class="schedule-dot"></span>
					<div>A moment worth sharing.<small>Wednesday · 09:00</small></div>
					<Icon name="check" size={14} />
				</div>
			</div>
		</article>
	</div>
	<article class="control-feature">
		<div class="control-icon"><Icon name="shield" size={24} /></div>
		<div>
			<span class="feature-kicker">YOUR CONTENT. YOUR CHOICES.</span>
			<h3>Share on your own terms.</h3>
			<p>
				Choose your audience, manage interactions, and review your post before
				it goes out.
			</p>
		</div>
		<div class="privacy-chips">
			<span><Icon name="check" size={12} />Privacy choices</span><span
				><Icon name="check" size={12} />Content disclosures</span
			><span><Icon name="check" size={12} />Posting status</span>
		</div>
	</article>
</section>
<section class="quiet-section section">
	<Icon name="leaf" size={28} />
	<h2>
		For the days you're full of ideas.<br />And the days you just need a plan.
	</h2>
	<p>
		A personal creative practice or a small team finding its rhythm.<br />One
		shared way to keep the next step clear.
	</p>
</section>
<section class="faq-section section" id="faq">
	<div>
		<span class="eyebrow">A LITTLE CLARITY</span>
		<h2>A few things<br />you might wonder.</h2>
		<p>Still curious? <a href="mailto:{site.email}">Say hello.</a></p>
	</div>
	<div class="faq-list">
		{#each faqs as faq}<details>
				<summary
					>{faq.q}<span class="faq-plus"><Icon name="plus" size={16} /></span
					></summary
				>
				<p>{faq.a}</p>
			</details>{/each}
	</div>
</section>
<section class="closing-section section">
	<div class="closing-orb" aria-hidden="true"></div>
	<span class="eyebrow">YOUR NEXT IDEA IS A GOOD PLACE TO START</span>
	<h2>Make a little room<br />for what's next.</h2>
	<a class="btn primary" href="/login"
		>Open your workspace<Icon name="arrow" size={16} /></a
	>
	<p>A little planning. More room to create.</p>
</section>

<style>
	.section {
		max-width: 1104px;
		margin: 0 auto;
		padding: 80px 0;
	}
	.hero {
		position: relative;
		max-width: 1104px;
		margin: auto;
		padding: 80px 0 0;
		text-align: center;
	}
	.hero-glow {
		position: absolute;
		top: 10px;
		left: 50%;
		transform: translateX(-50%);
		width: 90%;
		height: 640px;
		background: radial-gradient(ellipse, #e3ebd7aa, transparent 65%);
		z-index: -1;
	}
	.intro-label {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 7px 12px;
		border: 1px solid #ffffffd9;
		border-radius: 30px;
		background: #ffffff66;
		color: #7e8b70;
		font-size: 8px;
		font-weight: 500;
		letter-spacing: 0.13em;
	}
	.intro-label > span {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: #95a77e;
	}
	.hero h1 {
		font-size: clamp(48px, 6.4vw, 78px);
		font-weight: 430;
		line-height: 1.06;
		letter-spacing: -5px;
		margin: 25px 0 24px;
	}
	.hero h1 em {
		font-style: normal;
		color: #849c70;
	}
	.hero > p {
		font-size: 14px;
		line-height: 1.9;
		color: #727e69;
		margin: 0;
	}
	.hero-actions {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 26px;
		margin-top: 27px;
	}
	.hero-actions .btn {
		font-size: 12px;
		padding: 13px 20px;
	}
	.explore-link {
		display: flex;
		align-items: center;
		gap: 8px;
		color: #6f7f63;
		font-size: 11px;
		text-decoration: none;
	}
	.hero-note {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 6px;
		color: #98a18e;
		font-size: 9px;
		margin-top: 20px;
	}
	.hero-preview {
		margin: 54px auto 0;
		max-width: 960px;
		position: relative;
		scroll-margin-top: 110px;
	}
	.hero-preview::before {
		position: absolute;
		content: '';
		inset: 25% 0 -15%;
		z-index: -1;
		background:
			radial-gradient(ellipse at 15% 60%, #dce8d4aa, transparent 50%),
			radial-gradient(ellipse at 90% 50%, #e8e1edaa, transparent 50%);
		filter: blur(30px);
	}
	.preview-caption {
		max-width: 960px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		text-align: left;
		margin: 20px auto 0;
		color: #939c88;
		font-size: 9px;
	}
	.preview-caption > span:last-child {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 7px;
		letter-spacing: 0.1em;
	}
	.preview-caption i {
		width: 4px;
		height: 4px;
		background: #8c9f77;
		border-radius: 50%;
	}
	.flow-section {
		padding-top: 110px;
	}
	.section-intro {
		display: grid;
		grid-template-columns: 1fr 1fr;
		align-items: end;
		margin-bottom: 40px;
	}
	.section-intro > .eyebrow {
		grid-column: 1/-1;
	}
	.section-intro h2,
	.feature-heading h2,
	.faq-section h2 {
		font-size: 40px;
		font-weight: 440;
		margin: 16px 0 0;
		line-height: 1.15;
		letter-spacing: -1.8px;
	}
	.section-intro p,
	.feature-heading > p {
		font-size: 12px;
		line-height: 1.9;
		color: #727e69;
		justify-self: end;
		margin: 0 0 3px;
	}
	.flow-steps {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 30px;
	}
	.flow-step {
		border-top: 1px solid #dce2d3;
		padding-top: 23px;
	}
	.step-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		color: #a8b09e;
		font-size: 10px;
	}
	.step-icon {
		display: grid;
		place-items: center;
		width: 43px;
		height: 43px;
		border: 1px solid #ffffffb3;
		border-radius: 14px;
		color: #7a8d6e;
	}
	.lavender {
		background: #e9e3f0;
	}
	.peach {
		background: #f1e5d9;
	}
	.sky {
		background: #e3ebf0;
	}
	.sage {
		background: #e0e9d5;
	}
	.flow-step h3 {
		font-size: 17px;
		margin: 22px 0 10px;
		font-weight: 500;
		letter-spacing: -0.5px;
	}
	.flow-step p {
		font-size: 11px;
		line-height: 1.9;
		color: #727e69;
		margin: 0;
	}
	.features-section {
		padding-top: 50px;
	}
	.feature-heading {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		margin-bottom: 35px;
	}
	.feature-grid {
		display: grid;
		grid-template-columns: 1.25fr 1fr;
		gap: 20px;
	}
	.feature-grid article {
		border-radius: 24px;
		min-height: 350px;
		padding: 32px;
		border: 1px solid #fff;
		position: relative;
		overflow: hidden;
	}
	.feature-board {
		background: linear-gradient(130deg, #e9eddf, #dfe8d6);
		display: flex;
	}
	.feature-kicker {
		display: flex;
		align-items: center;
		gap: 7px;
		font-size: 8px;
		letter-spacing: 0.12em;
		color: #89987a;
		font-weight: 500;
	}
	.feature-grid h3 {
		font-size: 27px;
		margin: 20px 0 13px;
		font-weight: 450;
		line-height: 1.2;
	}
	.feature-grid p {
		font-size: 11px;
		color: #727e69;
		line-height: 1.9;
	}
	.board-art {
		position: absolute;
		right: 0;
		bottom: -15px;
		width: 51%;
		height: 270px;
	}
	.floating-card {
		position: absolute;
		border: 1px solid #ffffffeb;
		box-shadow: 0 10px 30px #59644910;
		background: #ffffffb3;
		border-radius: 13px;
		padding: 14px;
		width: 165px;
		backdrop-filter: blur(15px);
	}
	.floating-card.back {
		left: -12px;
		top: 20px;
		transform: rotate(-13deg);
	}
	.floating-card.front {
		right: 12px;
		bottom: 20px;
		transform: rotate(9deg);
	}
	.dot {
		display: inline-block;
		width: 6px;
		height: 6px;
		border-radius: 50%;
		margin-right: 5px;
	}
	.floating-card small {
		font-size: 6px;
		letter-spacing: 0.1em;
		color: #8d9883;
	}
	.floating-card strong {
		display: block;
		font-size: 11px;
		font-weight: 500;
		line-height: 1.7;
		margin: 10px 0;
	}
	.art-line {
		display: block;
		width: 100%;
		height: 4px;
		background: #e7ebdf;
		border-radius: 5px;
		margin-top: 7px;
	}
	.art-line.short {
		width: 60%;
	}
	.mini-image {
		height: 65px;
		background: #e3e9d9;
		border-radius: 8px;
		overflow: hidden;
		margin-bottom: 10px;
	}
	.mini-image span {
		display: block;
		width: 60px;
		height: 90px;
		margin: 15px auto;
		background: linear-gradient(100deg, #f9fbef, #c4d2b3);
		border-radius: 45%;
		transform: rotate(25deg);
		box-shadow: -35px 4px 0 #f6f9ef99;
	}
	.tiny-pill {
		font-size: 7px;
		background: #f1e5d9;
		padding: 3px 6px;
		border-radius: 4px;
		color: #a38c72;
	}
	.feature-calendar {
		background: linear-gradient(140deg, #f0edf4, #e8e4ee);
	}
	.calendar-art {
		margin: 32px -2px -12px;
		background: #ffffffa6;
		border: 1px solid white;
		border-radius: 14px;
		padding: 16px;
		transform: rotate(-3deg);
		box-shadow: 0 8px 26px #64607208;
	}
	.calendar-art-title {
		font-size: 9px;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.week-art {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		margin-top: 18px;
		gap: 6px;
	}
	.week-art > div {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 7px;
	}
	.week-art span {
		font-size: 7px;
		color: #9b92a4;
	}
	.week-art b {
		font-size: 10px;
		font-weight: 450;
		width: 25px;
		height: 25px;
		display: grid;
		place-items: center;
		border-radius: 8px;
	}
	.week-art b.chosen {
		background: #849576;
		color: white;
	}
	.week-art i {
		width: 4px;
		height: 4px;
		background: transparent;
		border-radius: 50%;
	}
	.week-art i.planned {
		background: #b1a1c2;
	}
	.schedule-sample {
		display: flex;
		gap: 8px;
		align-items: center;
		border-top: 1px solid #e6e2e9;
		padding-top: 12px;
		margin-top: 12px;
		font-size: 9px;
	}
	.schedule-dot {
		width: 5px;
		height: 5px;
		background: #a1b48d;
		border-radius: 50%;
	}
	.schedule-sample > div {
		flex: 1;
	}
	.schedule-sample small {
		display: block;
		font-size: 7px;
		color: #a29aa9;
		margin-top: 3px;
	}
	.schedule-sample > :global(svg) {
		color: #8b9a7d;
	}
	.control-feature {
		display: flex;
		align-items: center;
		gap: 22px;
		padding: 30px;
		border: 1px solid white;
		border-radius: 22px;
		margin-top: 20px;
		background: #ffffff6b;
	}
	.control-icon {
		display: grid;
		place-items: center;
		width: 54px;
		height: 54px;
		background: #e8eedf;
		border-radius: 18px;
		color: #8da078;
		flex: none;
	}
	.control-feature h3 {
		font-size: 21px;
		font-weight: 450;
		margin: 9px 0;
	}
	.control-feature p {
		font-size: 11px;
		color: #727e69;
		margin: 0;
	}
	.privacy-chips {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin-left: auto;
		flex: none;
	}
	.privacy-chips span {
		display: flex;
		gap: 7px;
		align-items: center;
		color: #7e8e70;
		font-size: 9px;
	}
	.quiet-section {
		text-align: center;
		padding: 60px 0 80px;
		border-bottom: 1px solid #dfe4d6;
	}
	.quiet-section > :global(svg) {
		color: #9aac87;
	}
	.quiet-section h2 {
		font-size: 32px;
		font-weight: 430;
		letter-spacing: -1.3px;
		line-height: 1.4;
		margin: 25px 0 20px;
	}
	.quiet-section p {
		font-size: 12px;
		line-height: 1.9;
		color: #727e69;
	}
	.faq-section {
		display: grid;
		grid-template-columns: 1fr 1.3fr;
		gap: 70px;
		padding: 85px 0;
	}
	.faq-section h2 {
		font-size: 35px;
	}
	.faq-section > div > p {
		color: #727e69;
		font-size: 11px;
		margin-top: 22px;
	}
	.faq-section a {
		color: #75876a;
	}
	.faq-list details {
		border-bottom: 1px solid #dfe4d6;
	}
	.faq-list summary {
		cursor: pointer;
		list-style: none;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		padding: 21px 0;
		font-size: 12px;
		font-weight: 450;
	}
	.faq-list summary::-webkit-details-marker {
		display: none;
	}
	.faq-plus {
		display: grid;
		place-items: center;
		color: #98a68b;
		flex: none;
		transition: transform 0.2s;
	}
	.faq-list details[open] .faq-plus {
		transform: rotate(45deg);
	}
	.faq-list details p {
		font-size: 11px;
		line-height: 1.9;
		color: #727e69;
		margin: 0 25px 20px 0;
	}
	.closing-section {
		position: relative;
		overflow: hidden;
		text-align: center;
		padding: 65px 24px;
		background: linear-gradient(115deg, #e4ead9, #e3e9d9 50%, #e8e5df);
		border: 1px solid #f9fbf1;
		border-radius: 28px;
		margin-bottom: 20px;
	}
	.closing-section h2 {
		position: relative;
		font-size: 46px;
		letter-spacing: -2px;
		font-weight: 430;
		line-height: 1.15;
		margin: 18px 0 25px;
	}
	.closing-section > .btn {
		position: relative;
		font-size: 11px;
	}
	.closing-section > p {
		font-size: 10px;
		color: #92a080;
		margin: 18px 0 0;
	}
	.closing-orb {
		position: absolute;
		width: 300px;
		height: 300px;
		border: 1px solid #ffffff88;
		border-radius: 50%;
		left: -100px;
		top: 30px;
		box-shadow:
			inset 0 0 60px #ffffff55,
			0 0 0 35px #ffffff15,
			0 0 0 70px #ffffff10;
	}
	@media (max-width: 1152px) {
		.hero,
		.section {
			margin-left: 40px;
			margin-right: 40px;
		}
		.hero-preview,
		.preview-caption {
			max-width: 960px;
		}
		.flow-steps {
			gap: 22px;
		}
		.feature-grid h3 {
			font-size: 24px;
		}
		.feature-grid article {
			padding: 25px;
		}
		.board-art {
			opacity: 0.85;
		}
		.feature-board > div:first-child {
			z-index: 1;
		}
		.privacy-chips {
			padding-left: 10px;
		}
	}
	@media (max-width: 800px) {
		.hero {
			padding-top: 65px;
		}
		.hero h1 {
			font-size: 62px;
			letter-spacing: -3.5px;
		}
		.section {
			padding-top: 60px;
			padding-bottom: 60px;
		}
		.flow-steps {
			grid-template-columns: repeat(2, 1fr);
			gap: 30px;
		}
		.feature-grid {
			grid-template-columns: 1fr;
		}
		.feature-grid article {
			min-height: 310px;
		}
		.board-art {
			right: 10%;
			width: 45%;
			bottom: 0;
			opacity: 1;
		}
		.feature-calendar .calendar-art {
			max-width: 360px;
			margin: 25px 0 0 auto;
		}
		.feature-calendar {
			min-height: 390px !important;
		}
		.control-feature {
			flex-wrap: wrap;
		}
		.privacy-chips {
			margin-left: 76px;
			flex-direction: row;
			flex-wrap: wrap;
			padding: 0;
			gap: 14px;
		}
		.faq-section {
			gap: 35px;
		}
		.faq-section h2 {
			font-size: 30px;
		}
		.preview-caption > span:last-child {
			display: none;
		}
	}
	@media (max-width: 540px) {
		.hero,
		.section {
			margin-left: 20px;
			margin-right: 20px;
		}
		.hero {
			padding-top: 54px;
		}
		.intro-label {
			font-size: 6px;
			padding: 7px 9px;
			letter-spacing: 0.1em;
		}
		.hero h1 {
			font-size: 49px;
			letter-spacing: -3px;
			margin: 24px 0 20px;
		}
		.hero > p {
			font-size: 12px;
			padding: 0 10px;
		}
		.desktop-break {
			display: none;
		}
		.hero-actions {
			gap: 20px;
			margin-top: 24px;
		}
		.hero-actions .btn {
			font-size: 11px;
		}
		.hero-note {
			font-size: 8px;
		}
		.hero-preview {
			margin-top: 38px;
		}
		.preview-caption {
			font-size: 8px;
			justify-content: center;
			text-align: center;
		}
		.section-intro {
			grid-template-columns: 1fr;
			gap: 15px;
		}
		.section-intro h2,
		.feature-heading h2 {
			font-size: 33px;
			margin-top: 0;
			letter-spacing: -1.3px;
		}
		.section-intro p {
			justify-self: start;
			font-size: 11px;
		}
		.section-intro > .eyebrow {
			font-size: 8px;
		}
		.flow-section {
			padding-top: 65px;
		}
		.flow-steps {
			gap: 25px 20px;
		}
		.flow-step h3 {
			font-size: 15px;
			margin-top: 16px;
		}
		.flow-step p {
			font-size: 10px;
		}
		.step-icon {
			width: 37px;
			height: 37px;
		}
		.feature-heading {
			display: block;
		}
		.feature-heading h2 {
			margin-top: 13px;
		}
		.feature-heading > p {
			font-size: 11px;
			margin-top: 15px;
		}
		.feature-grid article {
			padding: 24px;
			min-height: 350px;
		}
		.feature-grid h3 {
			font-size: 25px;
		}
		.board-art {
			right: -10px;
			bottom: -10px;
			width: 57%;
			height: 205px;
		}
		.floating-card {
			width: 140px;
			padding: 11px;
		}
		.floating-card.back {
			top: 20px;
			left: -30px;
		}
		.floating-card.front {
			right: 15px;
			bottom: 10px;
		}
		.feature-grid .feature-board {
			min-height: 390px;
		}
		.feature-calendar .calendar-art {
			margin: 25px -5px 0;
		}
		.control-feature {
			padding: 22px;
			gap: 15px;
		}
		.control-feature > div:nth-child(2) {
			flex: 1;
			min-width: 190px;
		}
		.control-feature h3 {
			font-size: 19px;
		}
		.control-feature p {
			font-size: 10px;
		}
		.privacy-chips {
			margin: 0;
			gap: 10px;
		}
		.privacy-chips span {
			font-size: 8px;
		}
		.quiet-section h2 {
			font-size: 24px;
			letter-spacing: -0.8px;
		}
		.quiet-section p {
			font-size: 11px;
		}
		.faq-section {
			grid-template-columns: 1fr;
			gap: 20px;
		}
		.faq-section h2 {
			font-size: 31px;
		}
		.closing-section {
			padding: 45px 15px;
			border-radius: 22px;
		}
		.closing-section .eyebrow {
			font-size: 7px;
		}
		.closing-section h2 {
			font-size: 36px;
		}
		.closing-orb {
			left: -200px;
		}
		.section {
			padding-top: 50px;
			padding-bottom: 50px;
		}
	}
	@media (max-width: 370px) {
		.hero h1 {
			font-size: 40px;
			letter-spacing: -2.4px;
			line-height: 1.12;
		}
	}
</style>
