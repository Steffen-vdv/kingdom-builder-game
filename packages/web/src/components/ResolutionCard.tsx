import React from 'react';
import type { ActionResolution } from '../state/useActionResolution';
import { useOptionalGameEngine } from '../state/GameContext';
import type { TimelineEntry } from './ResolutionTimeline';
import {
	CARD_BASE_CLASS,
	CARD_BODY_TEXT_CLASS,
	CARD_LABEL_CLASS,
	CARD_META_TEXT_CLASS,
	CARD_TITLE_TEXT_CLASS,
	CONTINUE_BUTTON_CLASS,
	joinClasses,
} from './common/cardStyles';
import {
	buildResolutionTimelineEntries,
	buildTimelineTree,
} from './ResolutionTimeline';
import {
	LEADING_EMOJI_PATTERN,
	SOURCE_LABELS,
	TRAILING_PHASE_PATTERN,
	buildFallbackResolutionLines,
	extractLeadingIcon,
	isResolutionSourceDetail,
	resolveResolutionSourceLabels,
} from './resolutionCardSupport';
import { resolveResolutionAccents } from './resolutionCardAccent';

interface ResolutionCardProps {
	title?: string;
	resolution: ActionResolution;
	onContinue: () => void;
}

function ResolutionCard({
	title,
	resolution,
	onContinue,
}: ResolutionCardProps) {
	const gameEngine = useOptionalGameEngine();
	const playerLabel = resolution.player?.name ?? resolution.player?.id ?? null;
	const playerName = playerLabel ?? 'Unknown player';
	const players = gameEngine?.sessionSnapshot.game.players ?? [];
	const resolvedPlayerId =
		resolution.player?.id ??
		gameEngine?.sessionSnapshot.game.activePlayerId ??
		null;
	const accents = resolveResolutionAccents(players, resolvedPlayerId);
	const containerClass = joinClasses(
		CARD_BASE_CLASS,
		'pointer-events-auto',
		accents.card,
	);
	const leadingLine = resolution.lines[0]?.trim() ?? '';

	const fallbackActionName = leadingLine
		.replace(/^[\s\p{Extended_Pictographic}\uFE0F\p{Pd}\p{Po}\p{So}]+/u, '')
		.replace(/^Played\s+/u, '')
		.replace(/[\p{Extended_Pictographic}\uFE0F]/gu, '')
		.replace(/\s{2,}/g, ' ')
		.trim();
	const sourceName = isResolutionSourceDetail(resolution.source)
		? (resolution.source.name?.trim() ?? '')
		: '';
	const sourceLabel = isResolutionSourceDetail(resolution.source)
		? resolution.source.label
		: undefined;
	const rawActionName = (resolution.action?.name ?? '').trim() || sourceName;
	const actionName = rawActionName || fallbackActionName;
	const resolvedLabels = resolveResolutionSourceLabels(resolution.source);
	const resolvedSourceKind = isResolutionSourceDetail(resolution.source)
		? resolution.source.kind
		: typeof resolution.source === 'string'
			? resolution.source
			: undefined;
	const actorLabel = (resolution.actorLabel ?? '').trim();
	const normalizedActorLabel = actorLabel ? actorLabel.toLocaleLowerCase() : '';
	const normalizedPlayerLabel = resolvedLabels.player
		.trim()
		.toLocaleLowerCase();
	const actorHeaderSubject = actionName
		? !actorLabel || normalizedActorLabel === normalizedPlayerLabel
			? actionName
			: actorLabel
		: actorLabel || actionName;
	const sourceIcon = isResolutionSourceDetail(resolution.source)
		? resolution.source.icon?.trim() || extractLeadingIcon(sourceLabel)
		: undefined;
	const fallbackIcon = extractLeadingIcon(leadingLine);
	const actionIcon =
		resolution.action?.icon?.trim() || sourceIcon || fallbackIcon;
	const defaultTitle = title ?? `${resolvedLabels.title} resolution`;
	const normalizedResolvedTitle = resolvedLabels.title
		.trim()
		.toLocaleLowerCase();
	const normalizedHeaderSubject = actorHeaderSubject
		?.trim()
		.toLocaleLowerCase();
	let headerTitle = actorHeaderSubject
		? normalizedHeaderSubject &&
			normalizedHeaderSubject !== normalizedResolvedTitle
			? `${resolvedLabels.title} - ${actorHeaderSubject}`
			: actorHeaderSubject
		: defaultTitle;
	if (resolvedSourceKind === 'phase') {
		const sanitizedPhaseSubject = (actorHeaderSubject || '')
			.replace(LEADING_EMOJI_PATTERN, '')
			.replace(TRAILING_PHASE_PATTERN, '')
			.replace(/\s{2,}/g, ' ')
			.trim();
		headerTitle = sanitizedPhaseSubject
			? `${SOURCE_LABELS.phase.title} - ${sanitizedPhaseSubject}`
			: `${SOURCE_LABELS.phase.title} resolution`;
	}
	const headerLabelClass = joinClasses(
		CARD_LABEL_CLASS,
		'text-amber-600 dark:text-amber-300',
	);
	const headerRowClass = 'flex items-start gap-4';
	const baseActionBadgeClass = joinClasses(
		'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl',
		'border border-white/50 bg-white/70 text-3xl shadow-inner',
		'shadow-amber-500/20 dark:border-white/10 dark:bg-slate-900/60',
		'dark:shadow-slate-900/40',
	);
	const actionBadgeClass = joinClasses(baseActionBadgeClass, accents.badge);
	const baseResolutionContainerClass = joinClasses(
		'mt-4 rounded-3xl border border-white/50 bg-white/70 p-4',
		'shadow-inner shadow-amber-500/10 ring-1 ring-white/30',
		'backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/60',
		'dark:shadow-slate-900/40 dark:ring-white/10',
	);
	const resolutionContainerClass = joinClasses(
		baseResolutionContainerClass,
		accents.section,
	);
	const timelineListClass = 'relative flex flex-col gap-3 pl-4';
	const timelineRailClass = joinClasses(
		'pointer-events-none absolute left-[0.875rem] top-4 bottom-4 w-px',
		'bg-white/30 dark:bg-white/10',
	);
	const timelineTextClass = joinClasses(
		CARD_BODY_TEXT_CLASS,
		'whitespace-pre-wrap leading-relaxed',
	);
	const nestedTimelineTextClass = joinClasses(
		timelineTextClass,
		'text-slate-600 dark:text-slate-300',
	);
	const timelineItemClass = 'relative flex items-start gap-3';
	const primaryMarkerClass = joinClasses(
		'mt-1.5 flex h-3 w-3 shrink-0 items-center justify-center rounded-full',
		'bg-amber-500 shadow-[0_0_0_4px_rgba(251,191,36,0.25)]',
		'dark:bg-amber-400 dark:shadow-[0_0_0_4px_rgba(251,191,36,0.2)]',
	);
	const nestedMarkerClass = joinClasses(
		'mt-1.5 flex h-2.5 w-2.5 shrink-0 items-center justify-center rounded-full',
		'bg-slate-400/80 shadow-[0_0_0_4px_rgba(148,163,184,0.2)]',
		'dark:bg-slate-500 dark:shadow-[0_0_0_4px_rgba(15,23,42,0.45)]',
	);
	const structuredTimeline = React.useMemo(
		() => buildTimelineTree(resolution.visibleTimeline),
		[resolution.visibleTimeline],
	);
	const timelineEntries = React.useMemo(() => {
		const options: Parameters<typeof buildResolutionTimelineEntries>[1] = {};

		if (actionIcon) {
			options.actionIcon = actionIcon;
		}
		if (actionName) {
			options.actionName = actionName;
		}

		return buildResolutionTimelineEntries(structuredTimeline, options);
	}, [actionIcon, actionName, structuredTimeline]);

	const fallbackLines = React.useMemo(() => {
		if (resolution.visibleTimeline.length > 0) {
			return [] as { depth: number; text: string }[];
		}
		return buildFallbackResolutionLines(resolution.visibleLines);
	}, [resolution.visibleLines, resolution.visibleTimeline]);
	const hasStructuredTimeline = timelineEntries.length > 0;

	function renderEntry(entry: TimelineEntry): React.ReactNode {
		const isSectionRoot = entry.kind === 'section';
		const markerClass = isSectionRoot ? primaryMarkerClass : nestedMarkerClass;
		const itemIndent = !isSectionRoot
			? { marginLeft: `${entry.level * 0.875}rem` }
			: undefined;
		const textClass = isSectionRoot
			? timelineTextClass
			: nestedTimelineTextClass;

		return (
			<div key={entry.key} className={timelineItemClass} style={itemIndent}>
				<span className={markerClass} aria-hidden="true" />
				<div className={textClass}>{entry.text}</div>
			</div>
		);
	}
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
							<div
								className={joinClasses('text-right', CARD_META_TEXT_CLASS)}
								aria-label="Player"
							>
								{playerName}
							</div>
						) : null}
					</div>
				</div>
				<div className={resolutionContainerClass}>
					<div className={joinClasses(CARD_LABEL_CLASS, 'text-slate-600')}>
						Resolution steps
					</div>
					{hasStructuredTimeline ? (
						<div className={joinClasses(timelineListClass, 'mt-3')}>
							<div aria-hidden="true" className={timelineRailClass} />
							{timelineEntries.map((entry) => renderEntry(entry))}
						</div>
					) : (
						<div className={joinClasses(timelineListClass, 'mt-3')}>
							<div aria-hidden="true" className={timelineRailClass} />
							{fallbackLines.map(({ text, depth }, index) => {
								const markerClass =
									depth === 0 ? primaryMarkerClass : nestedMarkerClass;
								const itemIndent =
									depth > 0
										? {
												marginLeft: `${depth * 0.875}rem`,
											}
										: undefined;
								const textClass =
									depth === 0 ? timelineTextClass : nestedTimelineTextClass;

								return (
									<div
										key={index}
										className={timelineItemClass}
										style={itemIndent}
									>
										<span className={markerClass} aria-hidden="true" />
										<div className={textClass}>{text}</div>
									</div>
								);
							})}
						</div>
					)}
				</div>
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
