import Button from '../components/common/Button';
import { ShowcaseCard } from '../components/layouts/ShowcasePage';
import { ModeCard } from './ModeCard';
import { useContentPackages } from '../state/useContentPackages';
import type { ResumeSessionRecord } from '../state/sessionResumeStorage';

const CTA_BUTTON_BASE_CLASS = [
	'w-full rounded-full px-6 py-3 text-base font-semibold',
	'sm:w-64',
].join(' ');

const SETTINGS_BUTTON_CLASS = [
	'w-full rounded-full border border-slate-200/60',
	'bg-white/55 px-5 py-2.5 text-sm font-semibold',
	'text-slate-700 transition',
	'hover:border-slate-300 hover:bg-white/75',
	'dark:border-white/10 dark:bg-white/5',
	'dark:text-slate-200',
	'dark:hover:border-white/20 dark:hover:bg-white/10',
	'sm:w-full',
].join(' ');

const CTA_DESCRIPTION_CLASS = [
	'mt-2 text-sm text-slate-600',
	'dark:text-slate-300/80',
].join(' ');

const TURN_NUMBER_FORMATTER = new Intl.NumberFormat('en-US');

const MODE_GRID_CLASS = ['grid gap-3', 'sm:grid-cols-2'].join(' ');

const SECTION_LABEL_CLASS = [
	'text-xs font-medium uppercase tracking-[0.2em]',
	'text-slate-400 dark:text-slate-500',
].join(' ');

export interface CallToActionProps {
	onStartGame: (contentId: string) => void;
	resumePoint: ResumeSessionRecord | null;
	onContinue: () => void;
	onOpenSettings: () => void;
}

export function CallToActionSection({
	onStartGame,
	resumePoint,
	onContinue,
	onOpenSettings,
}: CallToActionProps) {
	const { packages, defaultContentId } = useContentPackages();

	const formattedResumeTurn = resumePoint
		? TURN_NUMBER_FORMATTER.format(Math.max(1, Math.round(resumePoint.turn)))
		: null;

	const continueGameButton =
		resumePoint && formattedResumeTurn ? (
			<Button
				variant="primary"
				className={CTA_BUTTON_BASE_CLASS}
				onClick={onContinue}
				icon="⏯️"
			>
				Continue game (turn {formattedResumeTurn})
			</Button>
		) : null;

	const settingsButton = (
		<Button
			variant="ghost"
			className={SETTINGS_BUTTON_CLASS}
			onClick={onOpenSettings}
			icon="⚙️"
		>
			Settings
		</Button>
	);

	return (
		<ShowcaseCard className="flex flex-col gap-6">
			<div className="text-left">
				<h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
					Begin Your Reign
				</h2>
				<p className={CTA_DESCRIPTION_CLASS}>
					Choose a game mode to start playing.
				</p>
			</div>

			{continueGameButton ? (
				<div className="flex justify-center">{continueGameButton}</div>
			) : null}

			{packages.length > 0 ? (
				<div className="flex flex-col gap-3">
					<span className={SECTION_LABEL_CLASS}>Game Modes</span>
					<div className={MODE_GRID_CLASS}>
						{packages.map((pkg) => (
							<ModeCard
								key={pkg.id}
								pkg={pkg}
								isDefault={pkg.id === defaultContentId}
								onSelect={() => onStartGame(pkg.id)}
							/>
						))}
					</div>
				</div>
			) : null}

			<div className="flex justify-center">{settingsButton}</div>
		</ShowcaseCard>
	);
}
