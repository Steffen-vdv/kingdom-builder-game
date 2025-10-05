import { useCallback, useRef, useState } from 'react';
import type { PlayerStateSnapshot } from '@kingdom-builder/engine';
import { ACTION_EFFECT_DELAY } from './useGameLog';

interface UseActionResolutionOptions {
	addLog: (
		entry: string,
		player?: Pick<PlayerStateSnapshot, 'id' | 'name'>,
	) => void;
	setTrackedTimeout: (callback: () => void, delay: number) => number;
	timeScaleRef: React.MutableRefObject<number>;
	mountedRef: React.MutableRefObject<boolean>;
}

interface ShowResolutionOptions {
	lines: string | string[];
	player?: Pick<PlayerStateSnapshot, 'id' | 'name'>;
}

interface ActionResolution {
	lines: string[];
	visibleLines: string[];
	isComplete: boolean;
	player?: Pick<PlayerStateSnapshot, 'id' | 'name'>;
}

function useActionResolution({
	addLog,
	setTrackedTimeout,
	timeScaleRef,
	mountedRef,
}: UseActionResolutionOptions) {
	const [resolution, setResolution] = useState<ActionResolution | null>(null);
	const sequenceRef = useRef(0);

	const acknowledgeResolution = useCallback(() => {
		sequenceRef.current += 1;
		setResolution(null);
	}, []);

	const showResolution = useCallback(
		({ lines, player }: ShowResolutionOptions) => {
			const entries = (Array.isArray(lines) ? lines : [lines]).filter(
				(line): line is string => Boolean(line?.trim()),
			);
			sequenceRef.current += 1;
			const sequence = sequenceRef.current;
			if (!entries.length) {
				setResolution(null);
				return;
			}
			setResolution({
				lines: entries,
				visibleLines: [],
				isComplete: false,
				...(player ? { player } : {}),
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
		},
		[addLog, mountedRef, setTrackedTimeout, timeScaleRef],
	);

	return { resolution, showResolution, acknowledgeResolution };
}

export type { ActionResolution, ShowResolutionOptions };
export { useActionResolution };
