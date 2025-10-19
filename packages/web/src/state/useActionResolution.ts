import { useCallback, useRef, useState } from 'react';
import type { SessionPlayerStateSnapshot } from '@kingdom-builder/protocol';
import type { ActionLogLineDescriptor } from '../translation/log/timeline';
import {
	deriveTimelineFromLines,
	isPhaseSourceDetail,
	resolveActorLabel,
	shouldAppendPhaseResolution,
	type ActionResolution,
	type ResolutionActionMeta,
	type ResolutionSource,
	type ShowResolutionOptions,
} from './useActionResolution.shared';
import { ACTION_EFFECT_DELAY } from './useGameLog';

interface UseActionResolutionOptions {
	addLog: (
		entry: string | string[],
		player?: Pick<SessionPlayerStateSnapshot, 'id' | 'name'>,
	) => void;
	setTrackedTimeout: (callback: () => void, delay: number) => number;
	timeScaleRef: React.MutableRefObject<number>;
	mountedRef: React.MutableRefObject<boolean>;
}

type ResolutionStateUpdater =
	| ActionResolution
	| null
	| ((previous: ActionResolution | null) => ActionResolution | null);
function useActionResolution({
	addLog,
	setTrackedTimeout,
	timeScaleRef,
	mountedRef,
}: UseActionResolutionOptions) {
	const [resolution, assignResolution] = useState<ActionResolution | null>(
		null,
	);
	const resolutionRef = useRef<ActionResolution | null>(null);
	const sequenceRef = useRef(0);
	const resolverRef = useRef<(() => void) | null>(null);

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
			const entries = (Array.isArray(lines) ? lines : [lines]).filter(
				(line): line is string => Boolean(line?.trim()),
			);
			if (!entries.length) {
				setResolution(null);
				return Promise.resolve();
			}
			if (!mountedRef.current) {
				addLog(entries, player);
				return Promise.resolve();
			}
			sequenceRef.current += 1;
			const sequence = sequenceRef.current;
			return new Promise<void>((resolve) => {
				if (resolverRef.current) {
					resolverRef.current();
				}
				resolverRef.current = () => {
					resolverRef.current = null;
					resolve();
				};
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
				const previousVisible = baseResolution
					? baseResolution.visibleLines
					: [];
				const previousTimeline = baseResolution ? baseResolution.timeline : [];
				const previousVisibleTimeline = baseResolution
					? baseResolution.visibleTimeline
					: [];
				const startIndex = previousVisible.length;
				const combinedLines = shouldAppend
					? [...previousLines, ...entries]
					: [...entries];
				const combinedVisible = [...previousVisible];
				const normalizedTimeline = timeline?.filter(
					(descriptor): descriptor is ActionLogLineDescriptor =>
						Boolean(descriptor?.text?.trim()),
				);
				const fallbackTimeline = deriveTimelineFromLines(entries);
				const resolvedTimelineEntries = entries.map((_, index) => {
					const provided = normalizedTimeline?.[index];
					if (provided) {
						return provided;
					}
					const fallbackEntry = fallbackTimeline[index];
					if (!fallbackEntry) {
						throw new Error('Missing fallback timeline entry');
					}
					return fallbackEntry;
				});
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
					if (line === undefined) {
						return;
					}
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
						const descriptor = combinedTimeline[insertionIndex];
						const nextVisibleTimeline = descriptor
							? [...previous.visibleTimeline, descriptor]
							: previous.visibleTimeline;
						const isComplete = nextVisible.length >= previous.lines.length;
						return {
							...previous,
							visibleLines: nextVisible,
							visibleTimeline: nextVisibleTimeline,
							isComplete,
						};
					});
					addLog(line, resolvedPlayer);
				};

				const scheduleReveal = (offset: number) => {
					if (offset >= entries.length) {
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
			addLog,
			mountedRef,
			setResolution,
			setTrackedTimeout,
			timeScaleRef,
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
