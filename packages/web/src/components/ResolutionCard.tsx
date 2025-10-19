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

interface NormalizedResolutionLine {
	depth: number;
	text: string;
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

function normalizeResolutionLine(
	line: string,
): NormalizedResolutionLine | null {
	const withoutTabs = line.replace(/\t/g, '    ');
	const match = withoutTabs.match(/^(\s*)(.*)$/u);
	const leadingWhitespace = match?.[1] ?? '';
	let remainder = match?.[2] ?? withoutTabs;
	const hasMarker = /^(?:[•\-*\u2022]|↳)/u.test(remainder.trimStart());
	if (hasMarker) {
		remainder = remainder.replace(/^(?:\s*[•\-*\u2022]|\s*↳)\s*/u, '');
	}
	const sanitized = remainder.replace(/^\s+/u, '').replace(/\s+$/u, '');
	if (!sanitized) {
		return null;
	}
	const depthBase = Math.floor(leadingWhitespace.length / 3);
	const depthFromWhitespace =
		depthBase === 0 && leadingWhitespace.length > 0 ? 1 : depthBase;
	const depth = hasMarker
		? Math.max(1, depthFromWhitespace)
		: depthFromWhitespace;
	return { depth, text: sanitized };
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
	const timelineListClass = 'space-y-3';
	const timelineItemClass = joinClasses(
		'relative rounded-2xl border border-white/40 bg-white/80 p-3',
		'shadow-sm transition-colors hover:border-amber-400/60 hover:bg-white/90',
		'dark:border-white/10 dark:bg-slate-900/80 dark:hover:border-amber-300/40',
		'dark:hover:bg-slate-900/70',
	);
	const timelineMarkerClass = joinClasses(
		'pointer-events-none absolute left-3 top-3 flex h-6 w-6',
		'items-center justify-center rounded-xl border border-amber-300/80',
		'bg-amber-200/80 text-amber-700 shadow-inner shadow-amber-400/40',
		'dark:border-amber-200/40 dark:bg-amber-400/30 dark:text-amber-200',
	);
	const nestedTimelineMarkerClass = joinClasses(
		'pointer-events-none absolute left-4 top-3 flex h-4 w-4 items-center justify-center',
		'rounded-full border border-amber-200/70 bg-amber-200/40',
		'shadow-inner shadow-amber-400/30 dark:border-amber-200/30',
		'dark:bg-amber-400/20',
	);
	const timelineTextClass = joinClasses(
		CARD_BODY_TEXT_CLASS,
		'whitespace-pre-wrap leading-relaxed text-slate-800',
		'dark:text-slate-200',
	);
	const normalizedLines = resolution.visibleLines
		.map((line) => normalizeResolutionLine(line))
		.filter((value): value is NormalizedResolutionLine => value !== null);
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
						{normalizedLines.map((line, index) => {
							const markerClass =
								line.depth > 0
									? nestedTimelineMarkerClass
									: timelineMarkerClass;
							const itemStyle: React.CSSProperties = {
								marginLeft: `${line.depth * 0.75}rem`,
							};
							return (
								<div
									key={`${line.text}-${index}`}
									className={timelineItemClass}
									style={itemStyle}
								>
									<span className={markerClass} aria-hidden="true">
										<span className="h-2 w-2 rounded-full bg-amber-500/80 dark:bg-amber-300/60" />
									</span>
									<div className={timelineTextClass}>{line.text}</div>
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
