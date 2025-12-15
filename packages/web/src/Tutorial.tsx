import React from 'react';
import Button from './components/common/Button';
import {
	ShowcaseBackground,
	ShowcaseLayout,
	ShowcaseCard,
	SHOWCASE_BADGE_CLASS,
	SHOWCASE_INTRO_CLASS,
} from './components/layouts/ShowcasePage';
import { renderTokens } from './components/overview/OverviewLayout';

interface TutorialProps {
	onBack: () => void;
}

const QUICK_STEPS = [
	{
		icon: '🧭',
		title: 'Survey the Realm',
		description: [
			'Check your lands, population, and upcoming triggers.',
			'Then plan which engines are primed to fire.',
		].join(' '),
	},
	{
		icon: '⚙️',
		title: 'Prime Your Economy',
		description: [
			'Queue early actions that grow income or Action Points—momentum',
			'now pays off all game long.',
		].join(' '),
	},
	{
		icon: '🎯',
		title: 'Plan the Gambit',
		description: [
			'Line up developments, population swaps, or raids that chain',
			'together for a show-stopping reveal.',
		].join(' '),
	},
];

const STEP_CARD_CLASS = [
	'flex flex-col gap-2 rounded-2xl border border-white/60 bg-white/60 p-4',
	'text-sm text-slate-700 shadow-inner',
	'dark:border-white/10 dark:bg-white/5 dark:text-slate-300/80',
].join(' ');

const TUTORIAL_CARD_CLASS = [
	'max-w-3xl space-y-8 text-left text-slate-700',
	'dark:text-slate-200',
].join(' ');

const TUTORIAL_CALLOUT_CLASS = [
	'rounded-2xl border border-dashed border-white/60 bg-white/40 p-5',
	'text-sm leading-relaxed text-slate-700 shadow-inner',
	'dark:border-white/10 dark:bg-white/5 dark:text-slate-300/80',
].join(' ');

const TUTORIAL_BACK_BUTTON_CLASS = [
	'w-full rounded-full border border-white/50 bg-white/60 px-6 py-3',
	'text-sm font-semibold text-slate-700 shadow-md transition',
	'hover:border-white/70 hover:bg-white/80',
	'dark:border-white/10 dark:bg-white/5 dark:text-slate-200',
	'dark:hover:border-white/20 dark:hover:bg-white/10 sm:w-auto frosted-surface',
].join(' ');

const HERO_INTRO_TEXT = [
	'Get a lightning-fast primer before the full walkthrough lands.',
	[
		'Experiment freely and come back soon for narrated turns',
		'and guided challenges.',
	].join(' '),
].join(' ');

const TUTORIAL_PARAGRAPH_TEXT = [
	'Learn the rhythm of {game} with quick hits.',
	[
		'Each tip spotlights a core system so you can improvise while we polish',
		'the tour.',
	].join(' '),
].join(' ');

const TUTORIAL_CALLOUT_LINES = [
	'More scripted scenarios, narrated turns, and puzzle drills are on the way.',
	'Have ideas? Share them so we can fold them into the next update.',
];

export default function Tutorial({ onBack }: TutorialProps) {
	const introTokens: Record<string, React.ReactNode> = {
		game: <strong>Kingdom Builder</strong>,
	};

	return (
		<ShowcaseBackground>
			<ShowcaseLayout className="items-center">
				<header className="flex flex-col items-center text-center">
					<span className={SHOWCASE_BADGE_CLASS}>
						<span className="text-lg">🎓</span>
						<span>Learn By Doing</span>
					</span>
					<h1 className="mt-6 text-4xl font-black tracking-tight sm:text-5xl md:text-6xl">
						Tutorial
					</h1>
					<p className={SHOWCASE_INTRO_CLASS}>{HERO_INTRO_TEXT}</p>
				</header>

				<ShowcaseCard as="article" className={TUTORIAL_CARD_CLASS}>
					<p className="text-base leading-relaxed">
						{renderTokens(TUTORIAL_PARAGRAPH_TEXT, introTokens)}
					</p>

					<div className="grid gap-4 sm:grid-cols-3">
						{QUICK_STEPS.map((step) => (
							<div key={step.title} className={STEP_CARD_CLASS}>
								<div className="text-2xl">{step.icon}</div>
								<h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
									{step.title}
								</h2>
								<p>{step.description}</p>
							</div>
						))}
					</div>

					<div className={TUTORIAL_CALLOUT_CLASS}>
						{TUTORIAL_CALLOUT_LINES.map((line) => (
							<p key={line}>{line}</p>
						))}
					</div>
				</ShowcaseCard>

				<Button
					variant="ghost"
					className={TUTORIAL_BACK_BUTTON_CLASS}
					onClick={onBack}
					icon="🏰"
				>
					Back to Start
				</Button>
			</ShowcaseLayout>
		</ShowcaseBackground>
	);
}
