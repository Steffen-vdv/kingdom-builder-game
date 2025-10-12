import { useCallback, useRef, useState } from 'react';
import type { SessionPlayerStateSnapshot } from '@kingdom-builder/protocol/session';
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

function useActionResolution({
	addLog,
	setTrackedTimeout,
	timeScaleRef,
	mountedRef,
}: UseActionResolutionOptions) {
	const [resolution, setResolution] = useState<ActionResolution | null>(null);
	const sequenceRef = useRef(0);
	const resolverRef = useRef<(() => void) | null>(null);

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
				setResolution({
					lines: entries,
					visibleLines: [],
					isComplete: false,
					summaries,
					source: resolvedSource,
					requireAcknowledgement,
					...(resolvedActorLabel ? { actorLabel: resolvedActorLabel } : {}),
					...(player ? { player } : {}),
					...(action ? { action } : {}),
				});

				const revealLine = (index: number) => {
					const line = entries[index];
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
					addLog(line, player);
				};

				const scheduleReveal = (index: number) => {
					if (index >= entries.length) {
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

				revealLine(0);
				scheduleReveal(1);
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
