import { useCallback, useRef, useState } from 'react';
import type { PlayerStateSnapshot } from '@kingdom-builder/engine';
import { ACTION_EFFECT_DELAY } from './useGameLog';

interface UseActionResolutionOptions {
	addLog: (
		entry: string | string[],
		player?: Pick<PlayerStateSnapshot, 'id' | 'name'>,
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

type ResolutionSourceKind = 'action' | 'phase';

interface ResolutionSource {
	kind: ResolutionSourceKind;
	label: string;
	id?: string;
	name?: string;
	icon?: string;
}

type ResolutionSourceInput = ResolutionSource | ResolutionSourceKind;

interface ShowResolutionOptions {
	lines: string | string[];
	player?: Pick<PlayerStateSnapshot, 'id' | 'name'>;
	action?: ResolutionActionMeta;
	summaries?: string[];
	source?: ResolutionSourceInput;
	actorLabel?: string;
}

interface ActionResolution {
	lines: string[];
	visibleLines: string[];
	isComplete: boolean;
	player?: Pick<PlayerStateSnapshot, 'id' | 'name'>;
	action?: ResolutionActionMeta;
	summaries: string[];
	source: ResolutionSource;
	actorLabel?: string;
}

const DEFAULT_SOURCE_LABELS: Record<ResolutionSourceKind, string> = {
	action: 'Action',
	phase: 'Phase',
};

function buildActionSourceDetails(
	action: ResolutionActionMeta | undefined,
): Partial<Pick<ResolutionSource, 'id' | 'name' | 'icon'>> {
	if (!action) {
		return {};
	}
	const details: Pick<ResolutionSource, 'id' | 'name'> = {
		id: action.id,
		name: action.name,
	};
	if (action.icon) {
		return { ...details, icon: action.icon };
	}
	return details;
}

function normalizeSource(
	source: ResolutionSourceInput | undefined,
	action: ResolutionActionMeta | undefined,
): ResolutionSource {
	const fallbackKind: ResolutionSourceKind = action ? 'action' : 'phase';
	if (!source) {
		const details =
			fallbackKind === 'action' ? buildActionSourceDetails(action) : {};
		return {
			kind: fallbackKind,
			label: DEFAULT_SOURCE_LABELS[fallbackKind],
			...details,
		};
	}
	if (typeof source === 'string') {
		const kind: ResolutionSourceKind = source;
		const details = kind === 'action' ? buildActionSourceDetails(action) : {};
		const labelText =
			DEFAULT_SOURCE_LABELS[kind] ?? DEFAULT_SOURCE_LABELS.action;
		return {
			kind,
			label: labelText,
			...details,
		};
	}
	const label = source.label?.trim();
	const base = {
		kind: source.kind,
		label: label || DEFAULT_SOURCE_LABELS[source.kind],
	} as const;
	const details = {
		...(source.id ? { id: source.id } : {}),
		...(source.name ? { name: source.name } : {}),
		...(source.icon ? { icon: source.icon } : {}),
	};
	return { ...base, ...details };
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
				const resolvedSource = normalizeSource(source, action);
				const resolvedActorLabel =
					actorLabel ??
					(resolvedSource.kind === 'action'
						? (resolvedSource.name ?? action?.name)
						: undefined);
				const actorDetails = resolvedActorLabel
					? { actorLabel: resolvedActorLabel }
					: {};
				setResolution({
					lines: entries,
					visibleLines: [],
					isComplete: false,
					summaries,
					source: resolvedSource,
					...actorDetails,
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
						return {
							...previous,
							visibleLines: nextVisible,
							isComplete: nextVisible.length === previous.lines.length,
						};
					});
					addLog(line, player);
				};

				const scheduleReveal = (index: number) => {
					if (index >= entries.length) {
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
