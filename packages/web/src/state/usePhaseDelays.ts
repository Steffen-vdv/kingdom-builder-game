import { useCallback } from 'react';

interface PhaseDelayOptions {
	mountedRef: React.MutableRefObject<boolean>;
	timeScaleRef: React.MutableRefObject<number>;
	setTrackedInterval: (callback: () => void, delay: number) => number;
	clearTrackedInterval: (id: number) => void;
	setPhaseTimer: (value: number) => void;
}

export function usePhaseDelays({
	mountedRef,
	timeScaleRef,
	setTrackedInterval,
	clearTrackedInterval,
	setPhaseTimer,
}: PhaseDelayOptions) {
	const runDelay = useCallback(
		(total: number) => {
			const scale = timeScaleRef.current || 1;
			const adjustedTotal = total / scale;
			if (adjustedTotal <= 0) {
				if (mountedRef.current) {
					setPhaseTimer(0);
				}
				return Promise.resolve();
			}
			const tick = Math.max(16, Math.min(100, adjustedTotal / 10));
			if (mountedRef.current) {
				setPhaseTimer(0);
			}
			return new Promise<void>((resolve) => {
				let elapsed = 0;
				const interval = setTrackedInterval(() => {
					elapsed += tick;
					if (mountedRef.current) {
						setPhaseTimer(Math.min(1, elapsed / adjustedTotal));
					}
					if (elapsed >= adjustedTotal) {
						clearTrackedInterval(interval);
						if (mountedRef.current) {
							setPhaseTimer(0);
						}
						resolve();
					}
				}, tick);
			});
		},
		[
			clearTrackedInterval,
			mountedRef,
			setTrackedInterval,
			setPhaseTimer,
			timeScaleRef,
		],
	);

	const runStepDelay = useCallback(() => runDelay(1000), [runDelay]);

	return { runDelay, runStepDelay };
}
