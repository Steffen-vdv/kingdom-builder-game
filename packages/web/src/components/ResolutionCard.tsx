import React from 'react';
import type {
	ActionResolution,
	ResolutionSource,
} from '../state/useActionResolution';
import {
	CARD_BASE_CLASS,
	CARD_BODY_TEXT_CLASS,
	CARD_LABEL_CLASS,
	CARD_META_TEXT_CLASS,
	CARD_TITLE_TEXT_CLASS,
	CONTINUE_BUTTON_CLASS,
	joinClasses,
} from './common/cardStyles';

interface ResolutionLabels {
	title: string;
	player: string;
}

const SOURCE_LABELS: Record<'action' | 'phase', ResolutionLabels> = {
	action: {
		title: 'Action',
		player: 'Played by',
	},
	phase: {
		title: 'Phase',
		player: 'Phase owner',
	},
};

function isSourceDetail(
	source: ResolutionSource | undefined,
): source is Exclude<ResolutionSource, 'action' | 'phase'> {
	return typeof source === 'object' && source !== null && 'kind' in source;
}

interface ResolutionCardProps {
	title?: string;
	resolution: ActionResolution;
	onContinue: () => void;
}

function resolveSourceLabels(source: ResolutionSource | undefined) {
	if (!source) {
		return SOURCE_LABELS.action;
	}
	if (typeof source === 'string') {
		return SOURCE_LABELS[source] ?? SOURCE_LABELS.action;
	}
	const fallback = SOURCE_LABELS[source.kind] ?? SOURCE_LABELS.action;
	const title = source.label?.trim() || fallback.title;
	return {
		title,
		player: fallback.player,
	};
}

function ResolutionCard({
	title,
	resolution,
	onContinue,
}: ResolutionCardProps) {
	const playerLabel = resolution.player?.name ?? resolution.player?.id ?? null;
	const playerName = playerLabel ?? 'Unknown player';
	const containerClass = `${CARD_BASE_CLASS} pointer-events-auto`;
	const leadingLine = resolution.lines[0]?.trim() ?? '';

	const fallbackActionName = leadingLine
		.replace(/^[\s\p{Extended_Pictographic}\uFE0F\p{Pd}\p{Po}\p{So}]+/u, '')
		.replace(/^Played\s+/u, '')
		.replace(/[\p{Extended_Pictographic}\uFE0F]/gu, '')
		.replace(/\s{2,}/g, ' ')
		.trim();
	const sourceName = isSourceDetail(resolution.source)
		? (resolution.source.name?.trim() ?? '')
		: '';
	const rawActionName = (resolution.action?.name ?? '').trim() || sourceName;
	const actionName = rawActionName || fallbackActionName;
	const resolvedLabels = resolveSourceLabels(resolution.source);
	const actorLabel = (resolution.actorLabel ?? '').trim() || actionName;
	const actionIcon =
		resolution.action?.icon?.trim() ||
		(isSourceDetail(resolution.source)
			? (resolution.source.icon?.trim() ?? undefined)
			: undefined);
	const summaryItems = resolution.summaries.filter((item): item is string =>
		Boolean(item?.trim()),
	);
	const defaultTitle = title ?? `${resolvedLabels.title} resolution`;
	const headerTitle = actorLabel
		? `${resolvedLabels.title} - ${actorLabel}`
		: defaultTitle;
	const headerLabelClass = joinClasses(
		CARD_LABEL_CLASS,
		'text-amber-600 dark:text-amber-300',
	);
	const headerRowClass = 'flex items-start gap-4';
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
	const timelineItemClass = 'relative pl-8';
	const timelineMarkerClass = joinClasses(
		'absolute left-0 top-1.5 flex h-5 w-5 items-center justify-center',
		'rounded-lg border border-white/40 bg-white/80 text-xs font-semibold',
		'text-slate-500 shadow-sm dark:border-white/10 dark:bg-slate-900/80',
		'dark:text-slate-300',
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
	const shouldShowContinue = resolution.requireAcknowledgement;

	return (
		<div className={containerClass} data-state="enter">
			<div className="space-y-3">
				<div className={headerRowClass}>
					{actionIcon || actionName ? (
						<div className={actionBadgeClass} aria-hidden="true">
							{actionIcon ?? '✦'}
						</div>
					) : null}
					<div className="flex flex-1 items-start justify-between gap-4">
						<div className="space-y-1">
							<div className={headerLabelClass}>Resolution</div>
							<div className={CARD_TITLE_TEXT_CLASS}>{headerTitle}</div>
						</div>
						{resolution.player ? (
							<div className={joinClasses('text-right', CARD_META_TEXT_CLASS)}>
								{`${resolvedLabels.player} ${playerName}`}
							</div>
						) : null}
					</div>
				</div>
				<div className={resolutionContainerClass}>
					<div className={joinClasses(CARD_LABEL_CLASS, 'text-slate-600')}>
						Resolution steps
					</div>
					<ol className={timelineListClass}>
						{resolution.visibleLines.map((line, index) => (
							<li key={index} className={timelineItemClass}>
								<span className={timelineMarkerClass}>{index + 1}</span>
								<div className={timelineTextClass}>{line}</div>
							</li>
						))}
					</ol>
				</div>
				{resolution.isComplete && summaryItems.length ? (
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
			</div>
			{shouldShowContinue ? (
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
			) : null}
		</div>
	);
}

export type { ResolutionCardProps };
export { ResolutionCard };
