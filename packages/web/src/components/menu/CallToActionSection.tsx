import React, { useMemo } from 'react';
import Button from '../common/Button';
import { ShowcaseCard } from '../layouts/ShowcasePage';
import type { SavedGameMeta } from '../../state/persistence';

const CTA_CONTENT_LAYOUT_CLASS = [
	'flex flex-col gap-6',
	'sm:flex-row sm:items-center sm:justify-between',
].join(' ');

const CTA_DESCRIPTION_CLASS = [
	'mt-2 text-sm text-slate-600',
	'dark:text-slate-300/80',
].join(' ');

const CTA_BUTTON_COLUMN_CLASS = 'flex w-full flex-col gap-3 sm:w-64';

const PRIMARY_BUTTON_CLASS = [
	'w-full rounded-full px-5 py-3 text-base font-semibold shadow-lg',
	'shadow-blue-500/30',
].join(' ');

const CTA_HEADING_CLASS = [
	'text-xl font-semibold text-slate-900',
	'dark:text-slate-100',
].join(' ');

const DEV_BUTTON_CLASS = [
	'w-full rounded-full px-5 py-3 text-base font-semibold shadow-lg',
	'shadow-purple-600/30 dark:shadow-purple-900/40',
].join(' ');

const GHOST_BUTTON_CLASS = [
	'w-full rounded-full border border-slate-200/60',
	'bg-white/50 px-5 py-2 text-sm font-semibold text-slate-700',
	'hover:border-slate-300 hover:bg-white/80',
	'dark:border-white/10 dark:bg-white/5 dark:text-slate-200',
	'dark:hover:border-white/20 dark:hover:bg-white/10 sm:w-auto',
].join(' ');

const KNOWLEDGE_CARD_CLASS = [
	'mt-8 flex flex-col gap-4 rounded-2xl border border-white/60',
	'bg-white/60 p-4 text-sm text-slate-600 shadow-inner',
	'dark:border-white/10 dark:bg-white/5',
	'dark:text-slate-300/80',
].join(' ');

const KNOWLEDGE_HEADER_LAYOUT_CLASS = [
	'flex flex-col gap-4',
	'sm:flex-row sm:items-center sm:justify-between',
].join(' ');

const KNOWLEDGE_TITLE_CLASS = [
	'font-medium uppercase tracking-[0.3em] text-slate-500',
	'dark:text-slate-400',
].join(' ');

const KNOWLEDGE_ACTIONS_CLASS = ['flex flex-col gap-3 sm:flex-row'].join(' ');

const CTA_DESCRIPTION_TEXT = [
	'Leap into the campaign or explore a sandbox tuned for rapid',
	'iteration and experimentation.',
].join(' ');

const KNOWLEDGE_PARAGRAPH_TEXT = [
	'Discover the systems behind every decision before stepping into',
	'the throne room, or revisit the lore to sharpen your grand strategy.',
].join(' ');

export interface CallToActionSectionProps {
	onStart: () => void;
	onStartDev: () => void;
	onOverview: () => void;
	onTutorial: () => void;
	onContinue?: () => void;
	savedGameMeta?: SavedGameMeta | null;
}

export function CallToActionSection({
	onStart,
	onStartDev,
	onOverview,
	onTutorial,
	onContinue,
	savedGameMeta,
}: CallToActionSectionProps) {
	const hasSave = Boolean(savedGameMeta);
	const continueLabel = useMemo(() => {
		if (!savedGameMeta) {
			return 'Continue game';
		}
		return `Continue game (turn ${savedGameMeta.turn})`;
	}, [savedGameMeta]);
	const startLabel = hasSave ? 'Start new game' : 'Start game';
	const startButtonProps = {
		variant: 'primary' as const,
		className: PRIMARY_BUTTON_CLASS,
		onClick: onStart,
	};
	const continueButtonProps = onContinue
		? {
				variant: 'primary' as const,
				className: PRIMARY_BUTTON_CLASS,
				onClick: onContinue,
			}
		: null;
	const secondaryStartProps = {
		variant: 'secondary' as const,
		className: PRIMARY_BUTTON_CLASS,
		onClick: onStart,
	};
	const devButtonProps = {
		variant: 'dev' as const,
		className: DEV_BUTTON_CLASS,
		onClick: onStartDev,
	};
	const tutorialButtonProps = {
		variant: 'ghost' as const,
		className: GHOST_BUTTON_CLASS,
		onClick: onTutorial,
	};
	const overviewButtonProps = {
		variant: 'ghost' as const,
		className: GHOST_BUTTON_CLASS,
		onClick: onOverview,
	};
	const startButton = <Button {...startButtonProps}>{startLabel}</Button>;
	const secondaryStartButton = (
		<Button {...secondaryStartProps}>{startLabel}</Button>
	);
	const continueButton = continueButtonProps ? (
		<Button {...continueButtonProps}>{continueLabel}</Button>
	) : null;
	const devButton = <Button {...devButtonProps}>Start Dev/Debug Game</Button>;
	const tutorialButton = <Button {...tutorialButtonProps}>Tutorial</Button>;
	const overviewButton = (
		<Button {...overviewButtonProps}>Game Overview</Button>
	);
	const knowledgeActions = (
		<div className={KNOWLEDGE_ACTIONS_CLASS}>
			{tutorialButton}
			{overviewButton}
		</div>
	);
	const heroHeading = <h2 className={CTA_HEADING_CLASS}>Begin Your Reign</h2>;
	const heroDescription = (
		<p className={CTA_DESCRIPTION_CLASS}>{CTA_DESCRIPTION_TEXT}</p>
	);
	const knowledgeTitle = (
		<div className={KNOWLEDGE_TITLE_CLASS}>Learn The Basics</div>
	);
	return (
		<ShowcaseCard className="flex flex-col gap-8">
			<div className={CTA_CONTENT_LAYOUT_CLASS}>
				<div className="text-left">
					{heroHeading}
					{heroDescription}
				</div>
				<div className={CTA_BUTTON_COLUMN_CLASS}>
					{hasSave && onContinue ? (
						<>
							{continueButton}
							{secondaryStartButton}
						</>
					) : (
						startButton
					)}
					{devButton}
				</div>
			</div>

			<div className={KNOWLEDGE_CARD_CLASS}>
				<div className={KNOWLEDGE_HEADER_LAYOUT_CLASS}>
					{knowledgeTitle}
					{knowledgeActions}
				</div>
				<p>{KNOWLEDGE_PARAGRAPH_TEXT}</p>
			</div>
		</ShowcaseCard>
	);
}
