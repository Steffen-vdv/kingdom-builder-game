import { useEffect } from 'react';
import type { MutableRefObject } from 'react';
import type { PhaseProgressState } from './usePhaseProgress';
import { isFatalSessionError, markFatalSessionError } from './sessionErrors';

interface AutomaticPhaseRunnerOptions {
	phase: PhaseProgressState;
	manualStartTriggeredRef: MutableRefObject<boolean>;
	runUntilActionPhase: () => Promise<void>;
	onFatalSessionError?: ((error: unknown) => void) | undefined;
}

export function useAutomaticPhaseRunner({
	phase,
	manualStartTriggeredRef,
	runUntilActionPhase,
	onFatalSessionError,
}: AutomaticPhaseRunnerOptions) {
	useEffect(() => {
		if (phase.awaitingManualStart) {
			return;
		}
		if (manualStartTriggeredRef.current) {
			return;
		}
		let disposed = false;
		const run = async () => {
			try {
				await runUntilActionPhase();
			} catch (error) {
				if (disposed) {
					return;
				}
				if (!onFatalSessionError) {
					return;
				}
				if (isFatalSessionError(error)) {
					return;
				}
				markFatalSessionError(error);
				onFatalSessionError(error);
			}
		};
		void run();
		return () => {
			disposed = true;
		};
	}, [phase.awaitingManualStart, runUntilActionPhase, onFatalSessionError]);
}
