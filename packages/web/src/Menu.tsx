import React from 'react';
import Button from './components/common/Button';

interface MenuProps {
	onStart: () => void;
	onStartDev: () => void;
	onOverview: () => void;
	onTutorial: () => void;
}

const HIGHLIGHTS = [
	{
		icon: '🛡️',
		title: 'Fortify Your Legacy',
		description:
			'Balance resources, population, and strategy to guide your dynasty through prosperity or peril.',
	},
	{
		icon: '🌿',
		title: 'Shape Living Lands',
		description:
			'Cultivate fertile territories, raise developments, and watch each province flourish under your command.',
	},
	{
		icon: '📜',
		title: 'Write Royal Decrees',
		description:
			'Unlock new actions and forge alliances as every decision echoes across the realm.',
	},
];

const HERO_BADGE_CLASS = [
	'inline-flex items-center gap-2 rounded-full border border-white/40',
	'bg-white/70 px-4 py-1 text-xs font-semibold uppercase tracking-[0.4em]',
	'text-amber-700 shadow-sm',
	'dark:border-white/10 dark:bg-white/10 dark:text-amber-200',
	'frosted-surface',
].join(' ');

const CTA_SECTION_CLASS = [
	'w-full max-w-3xl rounded-3xl border border-white/50 bg-white/70 p-8',
	'shadow-2xl shadow-amber-900/10 dark:border-white/10 dark:bg-slate-900/70',
	'dark:shadow-slate-900/40',
	'frosted-surface',
].join(' ');

const KNOWLEDGE_CARD_CLASS = [
	'mt-8 flex flex-col gap-4 rounded-2xl border border-white/60 bg-white/60 p-4',
	'text-sm text-slate-600 shadow-inner dark:border-white/10 dark:bg-white/5',
	'dark:text-slate-300/80',
].join(' ');

const GHOST_BUTTON_CLASS = [
	'w-full rounded-full border border-slate-200/60 bg-white/50 px-5 py-2',
	'text-sm font-semibold text-slate-700 hover:border-slate-300 hover:bg-white/80',
	'dark:border-white/10 dark:bg-white/5 dark:text-slate-200',
	'dark:hover:border-white/20 dark:hover:bg-white/10 sm:w-auto',
].join(' ');

const PRIMARY_BUTTON_CLASS = [
	'w-full rounded-full px-5 py-3 text-base font-semibold shadow-lg',
	'shadow-blue-500/30',
].join(' ');

const DEV_BUTTON_CLASS = [
	'w-full rounded-full px-5 py-3 text-base font-semibold shadow-lg',
	'shadow-slate-900/10 dark:shadow-black/30',
].join(' ');

const MAIN_LAYOUT_CLASS = [
	'relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center',
	'gap-16 px-6 py-16',
].join(' ');

const INTRO_PARAGRAPH_CLASS = [
	'mt-4 max-w-2xl text-base text-slate-700',
	'dark:text-slate-300/90 sm:text-lg',
].join(' ');

const CTA_CONTENT_LAYOUT_CLASS = [
	'flex flex-col gap-6',
	'sm:flex-row sm:items-center sm:justify-between',
].join(' ');

const CTA_DESCRIPTION_CLASS = [
	'mt-2 text-sm text-slate-600',
	'dark:text-slate-300/80',
].join(' ');

const CTA_BUTTON_COLUMN_CLASS = ['flex w-full flex-col gap-3 sm:w-64'].join(
	' ',
);

const KNOWLEDGE_HEADER_LAYOUT_CLASS = [
	'flex flex-col gap-4',
	'sm:flex-row sm:items-center sm:justify-between',
].join(' ');

const KNOWLEDGE_TITLE_CLASS = [
	'font-medium uppercase tracking-[0.3em] text-slate-500',
	'dark:text-slate-400',
].join(' ');

const KNOWLEDGE_ACTIONS_CLASS = ['flex flex-col gap-3 sm:flex-row'].join(' ');

const HIGHLIGHT_CARD_CLASS = [
	'group relative overflow-hidden rounded-2xl border border-white/60 bg-white/70 p-6',
	'shadow-lg transition-transform duration-200 hover:-translate-y-1 hover:shadow-2xl',
	'dark:border-white/5 dark:bg-slate-900/70',
].join(' ');

const HIGHLIGHT_OVERLAY_CLASS = [
	'absolute inset-0 bg-gradient-to-br from-amber-200/0 via-white/40 to-transparent opacity-0',
	'transition-opacity duration-200 group-hover:opacity-100 dark:via-white/5',
].join(' ');

const INTRO_PARAGRAPH_TEXT = [
	'Craft a flourishing dynasty with tactical choices,',
	'evolving lands, and a thriving population.',
	'Each turn is a new chapter in your royal saga.',
].join(' ');

const CTA_DESCRIPTION_TEXT = [
	'Leap into the campaign or explore a sandbox tuned for rapid',
	'iteration and experimentation.',
].join(' ');

const KNOWLEDGE_PARAGRAPH_TEXT = [
	'Discover the systems behind every decision before stepping into the throne room,',
	'or revisit the lore to sharpen your grand strategy.',
].join(' ');

function HeroSection() {
	return (
		<header className="flex flex-col items-center text-center">
			<span className={HERO_BADGE_CLASS}>
				<span className="text-lg">🏰</span>
				<span>Rule Your Realm</span>
			</span>
			<h1 className="mt-6 text-4xl font-black tracking-tight sm:text-5xl md:text-6xl">
				Kingdom Builder
			</h1>
			<p className={INTRO_PARAGRAPH_CLASS}>{INTRO_PARAGRAPH_TEXT}</p>
		</header>
	);
}

interface CallToActionProps {
	onStart: () => void;
	onStartDev: () => void;
	onOverview: () => void;
	onTutorial: () => void;
}

function CallToActionSection({
	onStart,
	onStartDev,
	onOverview,
	onTutorial,
}: CallToActionProps) {
	return (
		<section className={CTA_SECTION_CLASS}>
			<div className={CTA_CONTENT_LAYOUT_CLASS}>
				<div className="text-left">
					<h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
						Begin Your Reign
					</h2>
					{/* prettier-ignore */}
					<p
className={CTA_DESCRIPTION_CLASS}
>
{CTA_DESCRIPTION_TEXT}
</p>
				</div>
				<div className={CTA_BUTTON_COLUMN_CLASS}>
					<Button
						variant="primary"
						className={PRIMARY_BUTTON_CLASS}
						onClick={onStart}
					>
						Start New Game
					</Button>
					<Button className={DEV_BUTTON_CLASS} onClick={onStartDev}>
						Start Dev/Debug Game
					</Button>
				</div>
			</div>

			<div className={KNOWLEDGE_CARD_CLASS}>
				<div className={KNOWLEDGE_HEADER_LAYOUT_CLASS}>
					{/* prettier-ignore */}
					<div
className={KNOWLEDGE_TITLE_CLASS}
>
Learn The Basics
</div>
					<div className={KNOWLEDGE_ACTIONS_CLASS}>
						<Button
							variant="ghost"
							className={GHOST_BUTTON_CLASS}
							onClick={onTutorial}
						>
							Tutorial
						</Button>
						<Button
							variant="ghost"
							className={GHOST_BUTTON_CLASS}
							onClick={onOverview}
						>
							Game Overview
						</Button>
					</div>
				</div>
				<p>{KNOWLEDGE_PARAGRAPH_TEXT}</p>
			</div>
		</section>
	);
}

function HighlightsSection() {
	return (
		<section className="grid w-full max-w-5xl grid-cols-1 gap-6 sm:grid-cols-3">
			{HIGHLIGHTS.map(({ icon, title, description }) => (
				<div key={title} className={HIGHLIGHT_CARD_CLASS}>
					<div className={HIGHLIGHT_OVERLAY_CLASS} />
					<div className="relative flex flex-col gap-3 text-left">
						<div className="text-3xl">{icon}</div>
						<h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
							{title}
						</h3>
						<p className="text-sm text-slate-600 dark:text-slate-300/80">
							{description}
						</p>
					</div>
				</div>
			))}
		</section>
	);
}

export default function Menu({
	onStart,
	onStartDev,
	onOverview,
	onTutorial,
}: MenuProps) {
	return (
		<div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-amber-100 via-rose-100 to-sky-100 text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-100">
			<div className="pointer-events-none absolute inset-0">
				<div className="absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-amber-300/30 blur-3xl dark:bg-amber-500/20" />
				<div className="absolute -bottom-20 -left-10 h-72 w-72 rounded-full bg-sky-300/30 blur-3xl dark:bg-sky-500/20" />
				<div className="absolute top-1/3 right-10 h-64 w-64 rounded-full bg-rose-300/30 blur-3xl dark:bg-rose-500/20" />
				<div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.6),_rgba(255,255,255,0)_55%)] dark:bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.55),_rgba(15,23,42,0)_60%)]" />
			</div>

			<div className={MAIN_LAYOUT_CLASS}>
				<HeroSection />
				<CallToActionSection
					onStart={onStart}
					onStartDev={onStartDev}
					onOverview={onOverview}
					onTutorial={onTutorial}
				/>
				<HighlightsSection />
			</div>
		</div>
	);
}
