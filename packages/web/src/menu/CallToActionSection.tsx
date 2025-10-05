import Button from '../components/common/Button';
import {
	BookIcon,
	HammerIcon,
	MapIcon,
	PlayIcon,
	SettingsIcon,
} from '../components/common/icons';
import { ShowcaseCard } from '../components/layouts/ShowcasePage';

const KNOWLEDGE_CARD_CLASS = [
	'mt-8 flex flex-col gap-4 rounded-2xl border border-white/60',
	'bg-white/60 p-4',
	'text-sm text-slate-600 shadow-inner dark:border-white/10',
	'dark:bg-white/5 dark:text-slate-300/80',
].join(' ');

const GHOST_BUTTON_CLASS = 'w-full sm:w-auto';

const PRIMARY_BUTTON_CLASS = 'w-full sm:w-auto';

const DEV_BUTTON_CLASS = 'w-full sm:w-auto';

const SETTINGS_BUTTON_CLASS = 'w-full';

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

const CTA_DESCRIPTION_TEXT = [
	'Leap into the campaign or explore a sandbox tuned for rapid',
	'iteration and experimentation.',
].join(' ');

const KNOWLEDGE_PARAGRAPH_TEXT = [
	'Discover the systems behind every decision before stepping into the throne room,',
	'or revisit the lore to sharpen your grand strategy.',
].join(' ');

export interface CallToActionProps {
	onStart: () => void;
	onStartDev: () => void;
	onOverview: () => void;
	onTutorial: () => void;
	onOpenSettings: () => void;
}

export function CallToActionSection({
	onStart,
	onStartDev,
	onOverview,
	onTutorial,
	onOpenSettings,
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
						icon={<PlayIcon />}
					>
						Start New Game
					</Button>
					<Button
						variant="dev"
						className={DEV_BUTTON_CLASS}
						onClick={onStartDev}
						icon={<HammerIcon />}
					>
						Start Dev/Debug Game
					</Button>
					<Button
						variant="ghost"
						className={SETTINGS_BUTTON_CLASS}
						onClick={onOpenSettings}
						icon={<SettingsIcon />}
					>
						Settings
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
							icon={<BookIcon />}
						>
							Tutorial
						</Button>
						<Button
							variant="ghost"
							className={GHOST_BUTTON_CLASS}
							onClick={onOverview}
							icon={<MapIcon />}
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
