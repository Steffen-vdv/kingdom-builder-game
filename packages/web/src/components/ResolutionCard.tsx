import React from 'react';
import type {
	ActionResolution,
	ResolutionSource,
} from '../state/useActionResolution';
import type {
	ActionLogLineDescriptor,
	ActionLogLineKind,
} from '../translation/log/timeline';
import {
	buildTimelineTree,
	collectTimelineItems,
	findSectionBaseDepth,
	renderTimelineEntry,
	type TimelineNode,
	type TimelineRenderConfig,
} from './resolutionTimeline';
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
	const normalizedResolvedTitle = resolvedLabels.title
		.trim()
		.toLocaleLowerCase();
	const normalizedHeaderSubject = actorHeaderSubject
		?.trim()
		.toLocaleLowerCase();
	const headerTitle = actorHeaderSubject
		? normalizedHeaderSubject &&
			normalizedHeaderSubject !== normalizedResolvedTitle
			? `${resolvedLabels.title} - ${actorHeaderSubject}`
			: actorHeaderSubject
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
	const timelineSectionsClass = 'mt-4 space-y-6';
	const timelineSectionClass = joinClasses(
		'relative flex flex-col gap-3 pl-4 pt-1',
	);
	const timelineRailClass = joinClasses(
		'pointer-events-none absolute left-[0.875rem] top-3 bottom-3 w-px',
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
	const timelineRenderConfig = React.useMemo<TimelineRenderConfig>(() => {
		return {
			timelineItemClass,
			primaryMarkerClass,
			nestedMarkerClass,
			timelineTextClass,
			nestedTimelineTextClass,
		};
	}, [
		nestedMarkerClass,
		nestedTimelineTextClass,
		primaryMarkerClass,
		timelineItemClass,
		timelineTextClass,
	]);
	const timelineEntries = React.useMemo<ActionLogLineDescriptor[]>(() => {
		const normalized: ActionLogLineDescriptor[] = [];
		for (const entry of resolution.visibleTimeline) {
			const trimmed = entry.text.trim();
			if (!trimmed) {
				continue;
			}
			normalized.push({ ...entry, text: trimmed });
		}
		if (normalized.length) {
			return normalized;
		}
		const fallback: ActionLogLineDescriptor[] = [];
		resolution.visibleLines.forEach((line, index) => {
			const text = line.trim();
			if (!text) {
				return;
			}
			const kind: ActionLogLineKind = index === 0 ? 'headline' : 'effect';
			fallback.push({
				text,
				depth: index === 0 ? 0 : 1,
				kind,
			});
		});
		return fallback;
	}, [resolution.visibleTimeline, resolution.visibleLines]);
	const timelineNodes = React.useMemo<TimelineNode[]>(() => {
		return buildTimelineTree(timelineEntries);
	}, [timelineEntries]);
	const timelineByKind = React.useMemo(() => {
		const map = new Map<ActionLogLineKind, TimelineNode[]>();
		for (const node of timelineNodes) {
			const kind = node.descriptor.kind;
			const bucket = map.get(kind);
			if (bucket) {
				bucket.push(node);
			} else {
				map.set(kind, [node]);
			}
		}
		return map;
	}, [timelineNodes]);
	const costNodes: TimelineNode[] = timelineByKind.get('cost') ?? [];
	const effectNodes = React.useMemo(() => {
		return timelineNodes.filter((node) => {
			const kind = node.descriptor.kind;
			if (kind === 'cost' || kind === 'cost-detail') {
				return false;
			}
			return true;
		});
	}, [timelineNodes]);
	const costBaseDepth = React.useMemo(() => {
		return findSectionBaseDepth(costNodes);
	}, [costNodes]);
	const effectBaseDepth = React.useMemo(() => {
		return findSectionBaseDepth(effectNodes);
	}, [effectNodes]);
	const costItems = React.useMemo(() => {
		return collectTimelineItems(costNodes, costBaseDepth);
	}, [costNodes, costBaseDepth]);
	const effectItems = React.useMemo(() => {
		return collectTimelineItems(effectNodes, effectBaseDepth);
	}, [effectNodes, effectBaseDepth]);
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
					<div className={timelineSectionsClass}>
						{costItems.length ? (
							<div className={timelineSectionClass}>
								<div aria-hidden="true" className={timelineRailClass} />
								{costItems.map((item) =>
									renderTimelineEntry(item, 'cost', timelineRenderConfig),
								)}
							</div>
						) : null}
						{effectItems.length ? (
							<div className="space-y-3">
								<div
									className={joinClasses(
										CARD_LABEL_CLASS,
										'flex items-center gap-2 pl-1',
										'text-slate-600 dark:text-slate-300',
									)}
								>
									<span aria-hidden="true">🪄</span>
									<span>Effects</span>
								</div>
								<div className={timelineSectionClass}>
									<div aria-hidden="true" className={timelineRailClass} />
									{effectItems.map((item) =>
										renderTimelineEntry(item, 'effect', timelineRenderConfig),
									)}
								</div>
							</div>
						) : null}
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
