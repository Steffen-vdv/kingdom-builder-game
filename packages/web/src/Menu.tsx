import React from 'react';
import Button from './components/common/Button';
import {
	ShowcaseBackground,
	ShowcaseLayout,
	ShowcaseCard,
	SHOWCASE_BADGE_CLASS,
	SHOWCASE_INTRO_CLASS,
} from './components/layouts/ShowcasePage';

interface MenuProps {
	onStart: () => void;
	onStartDev: () => void;
	onOverview: () => void;
	onTutorial: () => void;
}

const HIGHLIGHTS = [
	{
		icon: '⚔️',
		title: 'Lead Bold Campaigns',
		description: [
			'Chain daring orders and spring ambushes.',
			'Steal momentum before rivals can react.',
		].join(' '),
	},
	{
		icon: '🌱',
		title: 'Turbocharge Your Realm',
		description: [
			'Spin up booming economies and trigger population perks.',
			'Let every turn snowball into the next.',
		].join(' '),
	},
	{
		icon: '🧠',
		title: 'Forge Wild Combos',
		description: [
			'Unlock outrageous developments that bend the rules.',
			'Stitch together synergies that reshape the map.',
		].join(' '),
	},
];

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
	'shadow-purple-600/30 dark:shadow-purple-900/40',
].join(' ');

const CTA_CONTENT_LAYOUT_CLASS = [
	'flex flex-col gap-6',
	'sm:flex-row sm:items-center sm:justify-between',
].join(' ');

const CTA_DESCRIPTION_CLASS = [
	'mt-2 text-sm text-slate-600',
	'dark:text-slate-300/80',
].join(' ');

const CTA_BUTTON_COLUMN_CLASS = 'flex w-full flex-col gap-3 sm:w-64';

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
			<span className={SHOWCASE_BADGE_CLASS}>
				<span className="text-lg">🏰</span>
				<span>Rule Your Realm</span>
			</span>
			<h1 className="mt-6 text-4xl font-black tracking-tight sm:text-5xl md:text-6xl">
				Kingdom Builder
			</h1>
			<p className={SHOWCASE_INTRO_CLASS}>{INTRO_PARAGRAPH_TEXT}</p>
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
		<ShowcaseCard className="flex flex-col gap-8">
			<div className={CTA_CONTENT_LAYOUT_CLASS}>
				<div className="text-left">
					<h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
						Begin Your Reign
					</h2>
					{/* prettier-ignore */}
					<p className={CTA_DESCRIPTION_CLASS}>
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
					<Button
						variant="dev"
						className={DEV_BUTTON_CLASS}
						onClick={onStartDev}
					>
						Start Dev/Debug Game
					</Button>
				</div>
			</div>

			<div className={KNOWLEDGE_CARD_CLASS}>
				<div className={KNOWLEDGE_HEADER_LAYOUT_CLASS}>
					{/* prettier-ignore */}
					<div className={KNOWLEDGE_TITLE_CLASS}>
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
		</ShowcaseCard>
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
		<ShowcaseBackground>
			<ShowcaseLayout>
				<HeroSection />
				<CallToActionSection
					onStart={onStart}
					onStartDev={onStartDev}
					onOverview={onOverview}
					onTutorial={onTutorial}
				/>
				<HighlightsSection />
			</ShowcaseLayout>
		</ShowcaseBackground>
	);
}
