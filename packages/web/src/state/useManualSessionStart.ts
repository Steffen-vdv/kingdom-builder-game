import { useCallback, useRef } from 'react';
import type {
	PhaseProgressState,
	RunUntilActionPhaseOptions,
} from './usePhaseProgress';
import { useAutomaticPhaseRunner } from './useAutomaticPhaseRunner';

interface ManualSessionStartOptions {
	phase: PhaseProgressState;
	runUntilActionPhase: (options?: RunUntilActionPhaseOptions) => Promise<void>;
	startSession: () => Promise<void>;
	onFatalSessionError?: ((error: unknown) => void) | undefined;
}

export function useManualSessionStart({
	phase,
	runUntilActionPhase,
	startSession,
	onFatalSessionError,
}: ManualSessionStartOptions) {
	const manualStartTriggeredRef = useRef(false);
	useAutomaticPhaseRunner({
		phase,
		manualStartTriggeredRef,
		runUntilActionPhase,
		onFatalSessionError,
	});
	const handleStartSession = useCallback(async () => {
		manualStartTriggeredRef.current = true;
		try {
			await startSession();
		} finally {
			manualStartTriggeredRef.current = false;
		}
	}, [startSession]);
	return { handleStartSession };
}
