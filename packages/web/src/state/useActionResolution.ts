import { useCallback, useRef, useState } from 'react';
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

function isResolutionDetail(
	source: ResolutionSource,
): source is ResolutionSourceDetail {
	return typeof source === 'object' && source !== null && 'kind' in source;
}

function isPhaseResolutionSource(
	source: ResolutionSource,
): source is ResolutionPhaseSource {
	return isResolutionDetail(source) && source.kind === 'phase';
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

function shouldAppendPhaseResolution(
	previous: ActionResolution | null,
	source: ResolutionSource,
	action: ResolutionActionMeta | undefined,
) {
	if (!previous) {
		return false;
	}
	if (action || previous.action) {
		return false;
	}
	if (!isPhaseResolutionSource(previous.source)) {
		return false;
	}
	if (!isPhaseResolutionSource(source)) {
		return false;
	}
	if (previous.source.id && source.id) {
		return previous.source.id === source.id;
	}
	const previousLabel = previous.source.label?.trim();
	const nextLabel = source.label?.trim();
	if (previousLabel && nextLabel) {
		return previousLabel === nextLabel;
	}
	return true;
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

	const updateResolution = useCallback(
		(
			value:
				| ActionResolution
				| null
				| ((previous: ActionResolution | null) => ActionResolution | null),
		) => {
			setResolution((previous) => {
				const next = typeof value === 'function' ? value(previous) : value;
				resolutionRef.current = next;
				return next;
			});
		},
		[],
	);

	const acknowledgeResolution = useCallback(() => {
		sequenceRef.current += 1;
		updateResolution(null);
		if (resolverRef.current) {
			resolverRef.current();
			resolverRef.current = null;
		}
	}, [updateResolution]);

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
				updateResolution(null);
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
				const previousResolution = resolutionRef.current;
				const shouldAppend = shouldAppendPhaseResolution(
					previousResolution,
					resolvedSource,
					action,
				);
				const previousLines = shouldAppend
					? (previousResolution?.lines ?? [])
					: [];
				const previousSummaries = shouldAppend
					? (previousResolution?.summaries ?? [])
					: [];
				const combinedEntries = [...previousLines, ...entries];
				const combinedSummaries = [...previousSummaries, ...summaries];
				const baseVisible = shouldAppend ? [...previousLines] : [];
				const baseSource = shouldAppend
					? (previousResolution?.source ?? resolvedSource)
					: resolvedSource;
				const basePlayer = shouldAppend
					? (previousResolution?.player ?? player)
					: player;
				const baseAction = shouldAppend
					? (previousResolution?.action ?? action)
					: action;
				const baseActorLabel = shouldAppend
					? (previousResolution?.actorLabel ?? resolvedActorLabel)
					: resolvedActorLabel;
				const previousRequireAcknowledgement =
					previousResolution?.requireAcknowledgement;
				let combinedRequireAcknowledgement = requireAcknowledgement;
				if (shouldAppend) {
					combinedRequireAcknowledgement =
						previousRequireAcknowledgement ?? requireAcknowledgement;
				}
				const nextResolution: ActionResolution = {
					lines: combinedEntries,
					visibleLines: baseVisible,
					isComplete: baseVisible.length === combinedEntries.length,
					summaries: combinedSummaries,
					source: baseSource,
					requireAcknowledgement: combinedRequireAcknowledgement,
				};
				if (basePlayer) {
					nextResolution.player = basePlayer;
				}
				if (baseAction) {
					nextResolution.action = baseAction;
				}
				if (baseActorLabel) {
					nextResolution.actorLabel = baseActorLabel;
				}
				updateResolution(nextResolution);

				const revealStartIndex = baseVisible.length;

				const revealLine = (index: number) => {
					const line = combinedEntries[index];
					if (line === undefined) {
						return;
					}
					updateResolution((previous) => {
						if (!previous) {
							return previous;
						}
						if (sequenceRef.current !== sequence) {
							return previous;
						}
						if (previous.visibleLines.length > index) {
							return previous;
						}
						const nextVisible = previous.visibleLines.slice();
						nextVisible.push(line);
						const isComplete = nextVisible.length === previous.lines.length;
						return {
							...previous,
							visibleLines: nextVisible,
							isComplete,
						};
					});
					addLog(line, basePlayer);
				};

				const scheduleReveal = (index: number) => {
					if (index >= combinedEntries.length) {
						if (!requireAcknowledgement) {
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

				if (revealStartIndex < combinedEntries.length) {
					revealLine(revealStartIndex);
					scheduleReveal(revealStartIndex + 1);
				} else {
					scheduleReveal(revealStartIndex);
				}
			});
		},
		[addLog, mountedRef, setTrackedTimeout, timeScaleRef, updateResolution],
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
