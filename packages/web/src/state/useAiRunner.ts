import { useEffect } from 'react';
import type { SessionSnapshot } from '@kingdom-builder/protocol/session';
import { isFatalSessionError, markFatalSessionError } from './sessionSdk';

interface UseAiRunnerOptions {
	sessionId: string;
	sessionState: SessionSnapshot;
	runUntilActionPhaseCore: () => Promise<void>;
	enqueue: <T>(task: () => Promise<T> | T) => Promise<T>;
	getLatestSnapshot: () => SessionSnapshot | null;
	mountedRef: React.MutableRefObject<boolean>;
	onFatalSessionError?: (error: unknown) => void;
}

export function useAiRunner({
	sessionId,
	sessionState,
	runUntilActionPhaseCore,
	enqueue,
	getLatestSnapshot,
	mountedRef,
	onFatalSessionError,
}: UseAiRunnerOptions) {
	useEffect(() => {
		const phaseDefinition = sessionState.phases[sessionState.game.phaseIndex];
		if (!phaseDefinition?.action) {
			return;
		}
		if (sessionState.game.conclusion) {
			return;
		}
		const primaryPlayerId = sessionState.game.players[0]?.id;
		const activePlayerId = sessionState.game.activePlayerId;
		if (!primaryPlayerId || activePlayerId === primaryPlayerId) {
			return;
		}
		let disposed = false;
		const run = async () => {
			try {
				await enqueue(async () => {
					const latestSnapshot = getLatestSnapshot();
					if (disposed || !mountedRef.current) {
						return;
					}
					if (latestSnapshot?.game.conclusion) {
						return;
					}
					await runUntilActionPhaseCore();
				});
			} catch (error) {
				if (disposed || !mountedRef.current) {
					return;
				}
				if (isFatalSessionError(error)) {
					return;
				}
				if (onFatalSessionError) {
					markFatalSessionError(error);
					onFatalSessionError(error);
					return;
				}
				throw error;
			}
		};
		void run();
		return () => {
			disposed = true;
		};
	}, [
		enqueue,
		getLatestSnapshot,
		mountedRef,
		onFatalSessionError,
		runUntilActionPhaseCore,
		sessionId,
		sessionState.game.activePlayerId,
		sessionState.game.conclusion,
		sessionState.game.phaseIndex,
		sessionState.game.players,
		sessionState.phases,
	]);
}
