import { useCallback, useRef, useState } from 'react';
import type { ActionLogLineDescriptor } from '../translation/log/timeline';
import type {
	ActionResolution,
	ResolutionActionMeta,
	ResolutionSource,
	ShowResolutionOptions,
} from './useActionResolution.types';
import {
	deriveTimelineFromLines,
	isCompleteTimeline,
} from './resolutionTimeline';
import { ACTION_EFFECT_DELAY } from './useGameLog';
import {
	resolveActorLabel,
	isPhaseSourceDetail,
	shouldAppendPhaseResolution,
} from './useActionResolution.helpers';

interface UseActionResolutionOptions {
	addResolutionLog: (resolution: ActionResolution) => void;
	setTrackedTimeout: (callback: () => void, delay: number) => number;
	timeScaleRef: React.MutableRefObject<number>;
	mountedRef: React.MutableRefObject<boolean>;
	onResolutionStart?: () => void;
	onLineReveal?: () => void;
}

type ResolutionStateUpdater =
	| ActionResolution
	| null
	| ((previous: ActionResolution | null) => ActionResolution | null);

function useActionResolution({
	addResolutionLog,
	setTrackedTimeout,
	timeScaleRef,
	mountedRef,
	onResolutionStart,
	onLineReveal,
}: UseActionResolutionOptions) {
	const [resolution, assignResolution] = useState<ActionResolution | null>(
		null,
	);
	const resolutionRef = useRef<ActionResolution | null>(null);
	const sequenceRef = useRef(0);
	const resolverRef = useRef<(() => void) | null>(null);

	const pushResolutionLog = useCallback(
		(snapshot: ActionResolution) => {
			if (!snapshot.lines.length) {
				return;
			}
			const completeLines = [...snapshot.lines];
			const completeTimeline = [...snapshot.timeline];
			const resolutionLog: ActionResolution = {
				...snapshot,
				lines: completeLines,
				visibleLines: [...completeLines],
				timeline: completeTimeline,
				visibleTimeline: [...completeTimeline],
				summaries: [...snapshot.summaries],
				isComplete: true,
				requireAcknowledgement: false,
				source:
					typeof snapshot.source === 'string'
						? snapshot.source
						: { ...snapshot.source },
				...(snapshot.player ? { player: { ...snapshot.player } } : {}),
				...(snapshot.action ? { action: { ...snapshot.action } } : {}),
				...(snapshot.actorLabel ? { actorLabel: snapshot.actorLabel } : {}),
			};
			addResolutionLog(resolutionLog);
		},
		[addResolutionLog],
	);

	const setResolution = useCallback(
		(updater: ResolutionStateUpdater) => {
			assignResolution((previous) => {
				const next =
					typeof updater === 'function'
						? (
								updater as (
									prev: ActionResolution | null,
								) => ActionResolution | null
							)(previous)
						: updater;
				resolutionRef.current = next;
				return next;
			});
		},
		[assignResolution],
	);
	const acknowledgeResolution = useCallback(() => {
		sequenceRef.current += 1;
		setResolution(null);
		if (resolverRef.current) {
			resolverRef.current();
			resolverRef.current = null;
		}
	}, [setResolution]);

	const showResolution = useCallback(
		({
			lines,
			player,
			action,
			summaries = [],
			source,
			actorLabel,
			requireAcknowledgement = true,
			timeline,
		}: ShowResolutionOptions) => {
			const rawEntries = Array.isArray(lines) ? lines : [lines];
			const filteredEntries: string[] = [];
			const timelinePairs: (ActionLogLineDescriptor | undefined)[] = [];
			for (const [index, rawLine] of rawEntries.entries()) {
				if (!rawLine?.trim()) {
					continue;
				}
				filteredEntries.push(rawLine);
				timelinePairs.push(timeline?.[index]);
			}
			const entries = filteredEntries;
			if (!entries.length) {
				setResolution(null);
				return Promise.resolve();
			}
			const resolvedTimelineEntries =
				timeline && isCompleteTimeline(timelinePairs)
					? timelinePairs
					: deriveTimelineFromLines(entries);
			const resolvedSource: ResolutionSource =
				source ?? (action ? 'action' : 'phase');
			const shouldPersist = isPhaseSourceDetail(resolvedSource);
			const existingResolution = resolutionRef.current;
			const shouldAppend = shouldAppendPhaseResolution(
				existingResolution,
				resolvedSource,
				requireAcknowledgement,
			);
			const baseResolution = shouldAppend ? existingResolution : null;
			const previousLines = baseResolution ? baseResolution.lines : [];
			const previousVisible = baseResolution ? baseResolution.visibleLines : [];
			const previousTimeline = baseResolution ? baseResolution.timeline : [];
			const previousVisibleTimeline = baseResolution
				? baseResolution.visibleTimeline
				: [];
			const startIndex = previousVisible.length;
			const combinedLines = shouldAppend
				? [...previousLines, ...entries]
				: [...entries];
			const combinedVisible = [...previousVisible];
			const combinedTimeline = shouldAppend
				? [...previousTimeline, ...resolvedTimelineEntries]
				: [...resolvedTimelineEntries];
			const combinedVisibleTimeline = [...previousVisibleTimeline];
			const filteredSummaries = summaries
				.map((item) => item?.trim())
				.filter((item): item is string => Boolean(item));
			const combinedSummaries = baseResolution
				? [...baseResolution.summaries, ...filteredSummaries]
				: filteredSummaries;
			const resolvedActorLabel = resolveActorLabel(
				actorLabel,
				resolvedSource,
				action,
			);
			const resolvedPlayer = baseResolution
				? (player ?? baseResolution.player)
				: player;
			const resolvedAction = baseResolution
				? (action ?? baseResolution.action)
				: action;
			const actorForState = baseResolution
				? (resolvedActorLabel ?? baseResolution.actorLabel)
				: resolvedActorLabel;
			const resolvedSourceForState = baseResolution
				? baseResolution.source
				: resolvedSource;
			const resolvedRequireAcknowledgement = baseResolution
				? baseResolution.requireAcknowledgement
				: requireAcknowledgement;

			const finalSnapshot: ActionResolution = {
				lines: [...combinedLines],
				visibleLines: [...combinedLines],
				timeline: [...combinedTimeline],
				visibleTimeline: [...combinedTimeline],
				isComplete: true,
				summaries: [...combinedSummaries],
				source:
					typeof resolvedSourceForState === 'string'
						? resolvedSourceForState
						: { ...resolvedSourceForState },
				requireAcknowledgement: resolvedRequireAcknowledgement,
				...(actorForState ? { actorLabel: actorForState } : {}),
				...(resolvedPlayer ? { player: { ...resolvedPlayer } } : {}),
				...(resolvedAction ? { action: { ...resolvedAction } } : {}),
			};
			if (!mountedRef.current) {
				pushResolutionLog(finalSnapshot);
				return Promise.resolve();
			}
			sequenceRef.current += 1;
			const sequence = sequenceRef.current;
			if (!shouldAppend && onResolutionStart) {
				onResolutionStart();
			}
			return new Promise<void>((resolve) => {
				if (resolverRef.current) {
					resolverRef.current();
				}
				resolverRef.current = () => {
					resolverRef.current = null;
					resolve();
				};
				setResolution({
					lines: combinedLines,
					visibleLines: combinedVisible,
					timeline: combinedTimeline,
					visibleTimeline: combinedVisibleTimeline,
					isComplete: combinedVisible.length === combinedLines.length,
					summaries: combinedSummaries,
					source: resolvedSourceForState,
					requireAcknowledgement: resolvedRequireAcknowledgement,
					...(actorForState ? { actorLabel: actorForState } : {}),
					...(resolvedPlayer ? { player: resolvedPlayer } : {}),
					...(resolvedAction ? { action: resolvedAction } : {}),
				});

				const revealLine = (offset: number) => {
					const line = entries[offset];
					const descriptor = resolvedTimelineEntries[offset];
					if (line === undefined || descriptor === undefined) {
						return;
					}
					let appended = false;
					setResolution((previous) => {
						if (!previous) {
							return previous;
						}
						if (sequenceRef.current !== sequence) {
							return previous;
						}
						const insertionIndex = startIndex + offset;
						if (previous.visibleLines.length > insertionIndex) {
							return previous;
						}
						const nextVisible = [...previous.visibleLines, line];
						const nextVisibleTimeline = [
							...previous.visibleTimeline,
							descriptor,
						];
						const isComplete = nextVisible.length >= previous.lines.length;
						appended = true;
						return {
							...previous,
							visibleLines: nextVisible,
							visibleTimeline: nextVisibleTimeline,
							isComplete,
						};
					});
					if (appended && onLineReveal) {
						onLineReveal();
					}
				};

				const scheduleReveal = (offset: number) => {
					if (offset >= entries.length) {
						pushResolutionLog(finalSnapshot);
						if (!resolvedRequireAcknowledgement) {
							const scale = timeScaleRef.current || 1;
							const duration = ACTION_EFFECT_DELAY / scale;
							const finalize = () => {
								if (!mountedRef.current || sequenceRef.current !== sequence) {
									return;
								}
								if (shouldPersist) {
									setResolution((previous) => {
										if (!previous || previous.isComplete) {
											return previous;
										}
										return {
											...previous,
											isComplete: true,
										};
									});
									if (resolverRef.current) {
										resolverRef.current();
									}
								} else {
									acknowledgeResolution();
								}
							};
							if (duration <= 0) {
								finalize();
								return;
							}
							setTrackedTimeout(finalize, duration);
						}
						return;
					}
					const scale = timeScaleRef.current || 1;
					const duration = ACTION_EFFECT_DELAY / scale;
					if (duration <= 0) {
						if (!mountedRef.current || sequenceRef.current !== sequence) {
							return;
						}
						revealLine(offset);
						scheduleReveal(offset + 1);
						return;
					}
					setTrackedTimeout(() => {
						if (!mountedRef.current || sequenceRef.current !== sequence) {
							return;
						}
						revealLine(offset);
						scheduleReveal(offset + 1);
					}, duration);
				};

				revealLine(0);
				scheduleReveal(1);
			});
		},
		[
			acknowledgeResolution,
			pushResolutionLog,
			mountedRef,
			setResolution,
			setTrackedTimeout,
			timeScaleRef,
			onResolutionStart,
			onLineReveal,
		],
	);

	return { resolution, showResolution, acknowledgeResolution };
}

export type {
	ActionResolution,
	ResolutionActionMeta,
	ResolutionSource,
	ShowResolutionOptions,
};
export { useActionResolution };
