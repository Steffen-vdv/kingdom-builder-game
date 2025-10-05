import React from 'react';
import type { ActionResolution } from '../state/useActionResolution';
import {
	CARD_BASE_CLASS,
	CARD_BODY_TEXT_CLASS,
	CARD_LABEL_CLASS,
	CARD_META_TEXT_CLASS,
	CARD_TITLE_TEXT_CLASS,
	CONTINUE_BUTTON_CLASS,
	joinClasses,
} from './common/cardStyles';

interface ActionResolutionCardProps {
	title?: string;
	resolution: ActionResolution;
	onContinue: () => void;
}

function ActionResolutionCard({
	title,
	resolution,
	onContinue,
}: ActionResolutionCardProps) {
	const playerLabel = resolution.player?.name ?? resolution.player?.id ?? null;
	const playerName = playerLabel ?? 'Unknown player';
	const containerClass = `${CARD_BASE_CLASS} pointer-events-auto`;
	const headerTitle = title ?? 'Action resolution';
	const actionName = resolution.action?.name?.trim();
	const actionIcon = resolution.action?.icon?.trim();
	const summaryItems = resolution.summaries.filter((item): item is string =>
		Boolean(item?.trim()),
	);
	const headerLabelClass = joinClasses(
		CARD_LABEL_CLASS,
		'text-amber-600 dark:text-amber-300',
	);
	const headerRowClass = 'flex items-start justify-between gap-4';
	const actionBadgeClass = joinClasses(
		'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl',
		'border border-white/50 bg-white/70 text-3xl shadow-inner',
		'shadow-amber-500/20 dark:border-white/10 dark:bg-slate-900/60',
		'dark:shadow-slate-900/40',
	);
	const resolutionContainerClass = joinClasses(
		'mt-4 rounded-3xl border border-white/50 bg-white/70 p-4',
		'shadow-inner shadow-amber-500/10 ring-1 ring-white/30',
		'backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/60',
		'dark:shadow-slate-900/40 dark:ring-white/10',
	);
	const timelineListClass = 'space-y-3';
	const timelineItemClass = 'relative pl-6';
	const timelineMarkerClass = joinClasses(
		'absolute left-0 top-2 flex h-3 w-3 items-center justify-center',
		'rounded-full bg-amber-500 shadow-md shadow-amber-500/40',
	);
	const timelineTextClass = joinClasses(
		CARD_BODY_TEXT_CLASS,
		'whitespace-pre-wrap leading-relaxed',
	);
	const summaryContainerClass = joinClasses(
		'rounded-2xl border border-amber-500/30 bg-amber-50/80 p-3',
		'shadow-inner shadow-amber-500/20 dark:border-amber-400/30',
		'dark:bg-amber-400/10',
	);
	const summaryTextClass = joinClasses(
		CARD_BODY_TEXT_CLASS,
		'whitespace-pre-line text-amber-900 dark:text-amber-100',
	);

	return (
		<div className={containerClass} data-state="enter">
			<div className="space-y-3">
				<div className={headerRowClass}>
					<div className="space-y-1">
						<div className={headerLabelClass}>Resolution</div>
						<div className={CARD_TITLE_TEXT_CLASS}>{headerTitle}</div>
						{resolution.player ? (
							<div className={CARD_META_TEXT_CLASS}>
								{`Played by ${playerName}`}
							</div>
						) : null}
					</div>
					{actionIcon || actionName ? (
						<div className="flex flex-col items-end gap-2 text-right">
							<div className={actionBadgeClass} aria-hidden="true">
								{actionIcon ?? '✦'}
							</div>
							{actionName ? (
								<div className={CARD_META_TEXT_CLASS}>{actionName}</div>
							) : null}
						</div>
					) : null}
				</div>
				{summaryItems.length ? (
					<div className={summaryContainerClass}>
						<div className={joinClasses(CARD_LABEL_CLASS, 'text-amber-700')}>
							Highlights
						</div>
						<ul className="mt-2 space-y-1">
							{summaryItems.map((item, index) => (
								<li key={index} className={summaryTextClass}>
									{item}
								</li>
							))}
						</ul>
					</div>
				) : null}
				<div className={resolutionContainerClass}>
					<div className={joinClasses(CARD_LABEL_CLASS, 'text-slate-600')}>
						Resolution steps
					</div>
					<ol className={timelineListClass}>
						{resolution.visibleLines.map((line, index) => (
							<li key={index} className={timelineItemClass}>
								<span className={timelineMarkerClass} />
								<div className={timelineTextClass}>{line}</div>
							</li>
						))}
					</ol>
				</div>
			</div>
			<div className="mt-6 flex justify-end">
				<button
					type="button"
					onClick={onContinue}
					disabled={!resolution.isComplete}
					className={CONTINUE_BUTTON_CLASS}
				>
					Continue
				</button>
			</div>
		</div>
	);
}

export type { ActionResolutionCardProps };
export { ActionResolutionCard };
