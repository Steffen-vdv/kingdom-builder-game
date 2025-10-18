import { useCallback, useEffect, useRef, useState } from 'react';
import type { SessionPlayerStateSnapshot } from '@kingdom-builder/protocol';
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

interface ResolutionActionMeta {
	id: string;
	name: string;
	icon?: string;
}

interface ResolutionSourceBase {
	kind: 'action' | 'phase';
	label: string;
	icon?: string;
}

interface ResolutionActionSource extends ResolutionSourceBase {
	kind: 'action';
	id: string;
	name: string;
}

interface ResolutionPhaseSource extends ResolutionSourceBase {
	kind: 'phase';
	id?: string;
	name?: string;
}

type ResolutionSourceDetail = ResolutionActionSource | ResolutionPhaseSource;

type ResolutionSource = 'action' | 'phase' | ResolutionSourceDetail;

interface ShowResolutionOptions {
	lines: string | string[];
	player?: Pick<SessionPlayerStateSnapshot, 'id' | 'name'>;
	action?: ResolutionActionMeta;
	summaries?: string[];
	source?: ResolutionSource;
	actorLabel?: string;
	requireAcknowledgement?: boolean;
}

interface ActionResolution {
	lines: string[];
	visibleLines: string[];
	isComplete: boolean;
	player?: Pick<SessionPlayerStateSnapshot, 'id' | 'name'>;
	action?: ResolutionActionMeta;
	summaries: string[];
	source: ResolutionSource;
	actorLabel?: string;
	requireAcknowledgement: boolean;
}

function resolveActorLabel(
	label: string | undefined,
	source: ResolutionSource,
	action: ResolutionActionMeta | undefined,
): string | undefined {
	const trimmed = label?.trim();
	if (trimmed) {
		return trimmed;
	}
	if (typeof source === 'string') {
		if (source === 'action') {
			return action?.name?.trim() || undefined;
		}
		return undefined;
	}
	if (source.kind === 'action') {
		return source.name?.trim() || action?.name?.trim() || undefined;
	}
	return undefined;
}

function isPhaseSource(
	source: ResolutionSource | undefined,
): source is ResolutionPhaseSource | 'phase' {
	if (!source) {
		return false;
	}
	if (source === 'phase') {
		return true;
	}
	return typeof source === 'object' && source.kind === 'phase';
}

function resolvePhaseIdentifier(source: ResolutionSource | undefined) {
	if (!source) {
		return undefined;
	}
	if (typeof source === 'string') {
		return source === 'phase' ? 'phase' : undefined;
	}
	if (source.kind !== 'phase') {
		return undefined;
	}
	return source.id?.trim() || source.label?.trim();
}

function useActionResolution({
	addLog,
	setTrackedTimeout,
	timeScaleRef,
	mountedRef,
}: UseActionResolutionOptions) {
	const [resolution, setResolution] = useState<ActionResolution | null>(null);
	const sequenceRef = useRef(0);
	const resolverRef = useRef<(() => void) | null>(null);
	const resolutionRef = useRef<ActionResolution | null>(null);
	const lastPhaseResolutionRef = useRef<ActionResolution | null>(null);

	useEffect(() => {
		resolutionRef.current = resolution;
	}, [resolution]);

	useEffect(() => {
		if (resolution && isPhaseSource(resolution.source)) {
			lastPhaseResolutionRef.current = resolution;
			return;
		}
		if (resolution && !isPhaseSource(resolution.source)) {
			lastPhaseResolutionRef.current = null;
		}
	}, [resolution]);

	const acknowledgeResolution = useCallback(() => {
		sequenceRef.current += 1;
		setResolution(null);
		if (resolverRef.current) {
			resolverRef.current();
			resolverRef.current = null;
		}
	}, []);

	const showResolution = useCallback(
		({
			lines,
			player,
			action,
			summaries = [],
			source,
			actorLabel,
			requireAcknowledgement = true,
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
				const resolvedActorLabel = resolveActorLabel(
					actorLabel,
					resolvedSource,
					action,
				);
				const previousResolution =
					resolutionRef.current ?? lastPhaseResolutionRef.current;
				const isPhaseContinuation =
					previousResolution != null &&
					!requireAcknowledgement &&
					previousResolution.requireAcknowledgement === false &&
					isPhaseSource(previousResolution.source) &&
					isPhaseSource(resolvedSource) &&
					resolvePhaseIdentifier(previousResolution.source) ===
						resolvePhaseIdentifier(resolvedSource);
				const combinedEntries = isPhaseContinuation
					? [...previousResolution.lines, ...entries]
					: entries;
				const combinedVisible = isPhaseContinuation
					? [...previousResolution.visibleLines]
					: [];
				const combinedSummaries = isPhaseContinuation
					? [...previousResolution.summaries, ...summaries]
					: summaries;
				const combinedSource = isPhaseContinuation
					? previousResolution.source
					: resolvedSource;
				const combinedActorLabel = isPhaseContinuation
					? (previousResolution.actorLabel ?? resolvedActorLabel)
					: resolvedActorLabel;
				const combinedPlayer = isPhaseContinuation
					? (previousResolution.player ?? player)
					: player;
				const combinedAction = isPhaseContinuation
					? previousResolution.action
					: action;
				const combinedRequireAcknowledgement = isPhaseContinuation
					? previousResolution.requireAcknowledgement || requireAcknowledgement
					: requireAcknowledgement;
				const revealStartIndex = isPhaseContinuation
					? previousResolution.lines.length
					: 0;
				const nextResolution: ActionResolution = {
					lines: combinedEntries,
					visibleLines: combinedVisible,
					isComplete:
						combinedVisible.length === combinedEntries.length &&
						combinedEntries.length > 0,
					summaries: combinedSummaries,
					source: combinedSource,
					requireAcknowledgement: combinedRequireAcknowledgement,
					...(combinedActorLabel ? { actorLabel: combinedActorLabel } : {}),
					...(combinedPlayer ? { player: combinedPlayer } : {}),
					...(combinedAction ? { action: combinedAction } : {}),
				};
				setResolution(nextResolution);
				if (isPhaseSource(nextResolution.source)) {
					lastPhaseResolutionRef.current = nextResolution;
				} else {
					lastPhaseResolutionRef.current = null;
				}

				const logPlayer = player ?? combinedPlayer;
				const revealLine = (index: number) => {
					const line = combinedEntries[index];
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
						if (previous.visibleLines.length > index) {
							return previous;
						}
						const nextVisible = [...previous.visibleLines, line];
						const isComplete = nextVisible.length === previous.lines.length;
						return {
							...previous,
							visibleLines: nextVisible,
							isComplete,
						};
					});
					addLog(line, logPlayer);
				};

				const scheduleReveal = (index: number) => {
					if (index >= combinedEntries.length) {
						if (!combinedRequireAcknowledgement) {
							const scale = timeScaleRef.current || 1;
							const duration = ACTION_EFFECT_DELAY / scale;
							const finalize = () => {
								if (!mountedRef.current || sequenceRef.current !== sequence) {
									return;
								}
								acknowledgeResolution();
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
						revealLine(index);
						scheduleReveal(index + 1);
						return;
					}
					setTrackedTimeout(() => {
						if (!mountedRef.current || sequenceRef.current !== sequence) {
							return;
						}
						revealLine(index);
						scheduleReveal(index + 1);
					}, duration);
				};

				const initialRevealIndex = Math.max(revealStartIndex, 0);
				revealLine(initialRevealIndex);
				scheduleReveal(initialRevealIndex + 1);
			});
		},
		[addLog, mountedRef, setTrackedTimeout, timeScaleRef],
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
