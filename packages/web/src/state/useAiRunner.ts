import { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import type { SessionSnapshot } from '@kingdom-builder/protocol/session';
import { getSessionSnapshot } from './sessionStateStore';
import { enqueueSessionTask, hasAiController, runAiTurn } from './sessionAi';
import type { PhaseProgressState } from './usePhaseProgress';
import { isFatalSessionError, markFatalSessionError } from './sessionErrors';
import type { ActionResolution } from './useActionResolution';

interface UseAiRunnerOptions {
	sessionId: string;
	sessionSnapshot: SessionSnapshot;
	runUntilActionPhaseCore: () => Promise<void>;
	syncPhaseState: (
		snapshot: SessionSnapshot,
		overrides?: Partial<PhaseProgressState>,
	) => void;
	mountedRef: MutableRefObject<boolean>;
	onFatalSessionError?: (error: unknown) => void;
	resolution: ActionResolution | null;
}

export function useAiRunner({
	sessionId,
	sessionSnapshot,
	runUntilActionPhaseCore,
	syncPhaseState,
	mountedRef,
	onFatalSessionError,
	resolution,
}: UseAiRunnerOptions) {
	const runningRef = useRef(false);
	useEffect(() => {
		const phaseDefinition =
			sessionSnapshot.phases[sessionSnapshot.game.phaseIndex];
		if (!phaseDefinition?.action) {
			return;
		}
		if (sessionSnapshot.game.conclusion) {
			return;
		}
		if (runningRef.current) {
			return;
		}
		const activeId = sessionSnapshot.game.activePlayerId;
		if (!hasAiController(sessionId, activeId)) {
			return;
		}
		if (
			resolution &&
			(!resolution.isComplete || resolution.requireAcknowledgement)
		) {
			return;
		}
		void (async () => {
			runningRef.current = true;
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
				const ranTurn = await runAiTurn(sessionId, activeId);
				if (fatalError !== null) {
					runningRef.current = false;
					return;
				}
				const snapshot = getSessionSnapshot(sessionId);
				syncPhaseState(snapshot);
				if (!ranTurn) {
					runningRef.current = false;
					return;
				}
				if (!mountedRef.current) {
					runningRef.current = false;
					return;
				}
				if (fatalError !== null) {
					runningRef.current = false;
					return;
				}
				await enqueueSessionTask(sessionId, async () => {
					if (fatalError !== null) {
						return;
					}
					try {
						syncPhaseState(getSessionSnapshot(sessionId), {
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
			} finally {
				runningRef.current = false;
			}
		})();
	}, [
		sessionId,
		sessionSnapshot.game.activePlayerId,
		sessionSnapshot.game.phaseIndex,
		sessionSnapshot.phases,
		runUntilActionPhaseCore,
		syncPhaseState,
		mountedRef,
		onFatalSessionError,
		resolution,
	]);
}
