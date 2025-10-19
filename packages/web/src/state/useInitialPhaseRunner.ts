import { useEffect } from 'react';
import { isFatalSessionError, markFatalSessionError } from './sessionErrors';

interface UseInitialPhaseRunnerOptions {
	runUntilActionPhase: () => Promise<void>;
	onFatalSessionError?: (error: unknown) => void;
}

export function useInitialPhaseRunner({
	runUntilActionPhase,
	onFatalSessionError,
}: UseInitialPhaseRunnerOptions) {
	useEffect(() => {
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
	}, [runUntilActionPhase, onFatalSessionError]);
}
