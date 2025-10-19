import { useEffect } from 'react';
import type { MutableRefObject } from 'react';
import type { SessionSnapshot } from '@kingdom-builder/protocol/session';
import type { SessionAdapter } from './sessionTypes';
import type { PhaseProgressState } from './usePhaseProgress';
import { isFatalSessionError, markFatalSessionError } from './sessionErrors';

interface UseAiRunnerOptions {
	session: SessionAdapter;
	sessionSnapshot: SessionSnapshot;
	runUntilActionPhaseCore: () => Promise<void>;
	syncPhaseState: (
		snapshot: SessionSnapshot,
		overrides?: Partial<PhaseProgressState>,
	) => void;
	mountedRef: MutableRefObject<boolean>;
	onFatalSessionError?: (error: unknown) => void;
}

export function useAiRunner({
	session,
	sessionSnapshot,
	runUntilActionPhaseCore,
	syncPhaseState,
	mountedRef,
	onFatalSessionError,
}: UseAiRunnerOptions) {
	useEffect(() => {
		const phaseDefinition =
			sessionSnapshot.phases[sessionSnapshot.game.phaseIndex];
		if (!phaseDefinition?.action) {
			return;
		}
		if (sessionSnapshot.game.conclusion) {
			return;
		}
		const activeId = sessionSnapshot.game.activePlayerId;
		if (!session.hasAiController(activeId)) {
			return;
		}
		void (async () => {
			let fatalError: unknown = null;
			const forwardFatalError = (error: unknown) => {
				if (fatalError !== null) {
					return;
				}
				fatalError = error;
				if (isFatalSessionError(error)) {
					return;
				}
				if (onFatalSessionError) {
					markFatalSessionError(error);
					onFatalSessionError(error);
				}
			};
			try {
				const ranTurn = await session.runAiTurn(activeId);
				if (fatalError !== null) {
					return;
				}
				const snapshot = session.getSnapshot();
				syncPhaseState(snapshot);
				if (!ranTurn) {
					return;
				}
				if (!mountedRef.current) {
					return;
				}
				if (fatalError !== null) {
					return;
				}
				void session.enqueue(async () => {
					if (fatalError !== null) {
						return;
					}
					try {
						syncPhaseState(session.getSnapshot(), {
							isAdvancing: true,
							canEndTurn: false,
						});
						await runUntilActionPhaseCore();
					} catch (error) {
						forwardFatalError(error);
					}
				});
			} catch (error) {
				forwardFatalError(error);
			}
		})();
	}, [
		session,
		sessionSnapshot.game.activePlayerId,
		sessionSnapshot.game.phaseIndex,
		sessionSnapshot.phases,
		runUntilActionPhaseCore,
		syncPhaseState,
		mountedRef,
		onFatalSessionError,
	]);
}
