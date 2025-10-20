import { useEffect } from 'react';
import { isFatalSessionError, markFatalSessionError } from './sessionErrors';

interface RunUntilActionPhaseSyncOptions {
	runUntilActionPhase: () => Promise<void>;
	onFatalSessionError?: (error: unknown) => void;
}

export function useRunUntilActionPhaseSync({
	runUntilActionPhase,
	onFatalSessionError,
}: RunUntilActionPhaseSyncOptions) {
	useEffect(() => {
		let disposed = false;
		const run = async () => {
			try {
				await runUntilActionPhase();
			} catch (error) {
				if (disposed || !onFatalSessionError) {
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
