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
	const actionIcon =
		resolution.action?.icon?.trim() ||
		(isSourceDetail(resolution.source)
			? (resolution.source.icon?.trim() ?? undefined)
			: undefined);
	const defaultTitle = title ?? `${resolvedLabels.title} resolution`;
	const headerTitle = actorHeaderSubject
		? `${resolvedLabels.title} - ${actorHeaderSubject}`
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
	const timelineListClass = 'relative mt-4 flex flex-col gap-3 pl-4';
	const timelineRailClass = joinClasses(
		'pointer-events-none absolute left-[0.875rem] top-6 bottom-6 w-px',
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
	const parsedLines = React.useMemo(() => {
		function parseLine(line: string) {
			const patterns = [
				// Explicit three-space indent
				/^(?: {3})/,
				// Leading bullets with optional whitespace
				/^(?:[ \t]*[•▪‣◦●]\s+)/u,
				// Connector arrows with optional whitespace
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

			const text = remaining.trimStart();
			return { depth, text };
		}

		return resolution.visibleLines.map((line) => parseLine(line));
	}, [resolution.visibleLines]);
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
					<div className={timelineListClass}>
						<div aria-hidden="true" className={timelineRailClass} />
						{parsedLines.map(({ text, depth }, index) => {
							const markerClass =
								depth === 0 ? primaryMarkerClass : nestedMarkerClass;
							const itemIndent =
								depth > 0 ? { marginLeft: `${depth * 0.875}rem` } : undefined;
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
