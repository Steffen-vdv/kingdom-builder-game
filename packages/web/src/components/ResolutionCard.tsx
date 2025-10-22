import React from 'react';
import type {
	ActionResolution,
	ResolutionSource,
} from '../state/useActionResolution';
import type { TimelineEntry } from './ResolutionTimeline';
import {
	CARD_BASE_CLASS,
	CARD_BODY_TEXT_CLASS,
	CARD_LABEL_CLASS,
	CARD_META_TEXT_CLASS,
	CARD_TITLE_TEXT_CLASS,
	CONTINUE_BUTTON_CLASS,
	NEXT_TURN_BUTTON_CLASS,
	joinClasses,
} from './common/cardStyles';
import { usePlayerAccentClasses } from './common/usePlayerAccentClasses';
import {
	buildTimelineTree,
	buildResolutionTimelineEntries,
	normalizeModifierDescription,
} from './ResolutionTimeline';
import { useSoundEffectsContext } from '../state/SoundEffectsContext';

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

const LEADING_EMOJI_PATTERN =
	/^(?:\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?)*)/u;

function extractLeadingIcon(value: string | undefined) {
	if (!value) {
		return undefined;
	}
	const trimmed = value.trimStart();
	if (!trimmed) {
		return undefined;
	}
	const match = trimmed.match(LEADING_EMOJI_PATTERN);
	if (!match) {
		return undefined;
	}
	const icon = match[0]?.trim();
	return icon && /\p{Extended_Pictographic}/u.test(icon) ? icon : undefined;
}

function isSourceDetail(
	source: ResolutionSource | undefined,
): source is Exclude<ResolutionSource, 'action' | 'phase'> {
	return typeof source === 'object' && source !== null && 'kind' in source;
}

interface ResolutionCardProps {
	title?: string;
	resolution: ActionResolution;
	onContinue: () => void;
	continueMode?: 'continue' | 'next-turn';
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
	continueMode = 'continue',
}: ResolutionCardProps) {
	const playerLabel = resolution.player?.name ?? resolution.player?.id ?? null;
	const playerName = playerLabel ?? 'Unknown player';
	const resolveAccentClasses = usePlayerAccentClasses();
	const accentClasses = resolveAccentClasses(resolution.player?.id ?? null);
	const { playUiClick } = useSoundEffectsContext();
	const handleContinueClick = React.useCallback(() => {
		playUiClick();
		onContinue();
	}, [onContinue, playUiClick]);
	const containerClass = joinClasses(
		CARD_BASE_CLASS,
		'pointer-events-auto',
		accentClasses.card,
	);
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
	const sourceLabel = isSourceDetail(resolution.source)
		? resolution.source.label
		: undefined;
	const rawActionName = (resolution.action?.name ?? '').trim() || sourceName;
	const actionName = rawActionName || fallbackActionName;
	const resolvedLabels = resolveSourceLabels(resolution.source);
	const resolvedSourceKind = isSourceDetail(resolution.source)
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
	const sourceIcon = isSourceDetail(resolution.source)
		? resolution.source.icon?.trim() || extractLeadingIcon(sourceLabel)
		: undefined;
	const fallbackIcon = extractLeadingIcon(leadingLine);
	const actionIcon =
		resolution.action?.icon?.trim() || sourceIcon || fallbackIcon;
	const resolutionLabelBase =
		resolvedSourceKind === 'phase'
			? SOURCE_LABELS.phase.title
			: resolvedLabels.title;
	const resolutionLabel = `${resolutionLabelBase} Resolution`;
	const defaultTitle = title ?? resolutionLabel;
	let headerTitle = actorHeaderSubject || defaultTitle;
	if (resolvedSourceKind === 'phase') {
		const sanitizedPhaseSubject = (actorHeaderSubject || '')
			.replace(LEADING_EMOJI_PATTERN, '')
			.replace(/\s{2,}/g, ' ')
			.trim();
		headerTitle = sanitizedPhaseSubject || defaultTitle;
	}
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

		if (actionName) {
			options.actionName = actionName;
		}

		if (actionIcon) {
			options.actionIcon = actionIcon;
		}

		return buildResolutionTimelineEntries(structuredTimeline, options);
	}, [actionIcon, actionName, structuredTimeline]);

	const fallbackLines = React.useMemo(() => {
		if (resolution.visibleTimeline.length > 0) {
			return [] as { depth: number; text: string }[];
		}

		function parseLine(line: string) {
			const patterns = [
				/^(?: {3})/,
				/^(?:[ \t]*[•▪‣◦●]\s+)/u,
				/^(?:[ \t]*[↳➜➤➣]\s+)/u,
			];

			let remaining = line;
			let depth = 0;
			let matched = true;

			while (matched) {
				matched = false;
				for (const pattern of patterns) {
					const match = remaining.match(pattern);
					if (match && match[0].length > 0) {
						remaining = remaining.slice(match[0].length);
						depth += 1;
						matched = true;
						break;
					}
				}
			}

			const text = normalizeModifierDescription(remaining.trimStart());
			return { depth, text };
		}

		return resolution.visibleLines.map((line) => parseLine(line));
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
	const isNextTurnMode = continueMode === 'next-turn';
	const continueButtonClass = isNextTurnMode
		? NEXT_TURN_BUTTON_CLASS
		: CONTINUE_BUTTON_CLASS;
	const continueButtonLabel = isNextTurnMode ? 'Next Turn' : 'Continue';
	const continueButtonIcon = isNextTurnMode ? '»' : '→';

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
							<div className={headerLabelClass}>{resolutionLabel}</div>
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
						onClick={handleContinueClick}
						disabled={!resolution.isComplete}
						className={continueButtonClass}
					>
						<span>{continueButtonLabel}</span>
						<span aria-hidden="true">{continueButtonIcon}</span>
					</button>
				</div>
			) : null}
		</div>
	);
}

export type { ResolutionCardProps };
export { ResolutionCard };
