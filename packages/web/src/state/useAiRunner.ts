import { useEffect } from 'react';
import type { MutableRefObject } from 'react';
import type { SessionSnapshot } from '@kingdom-builder/protocol/session';
import type { LegacySession } from './sessionTypes';
import type { PhaseProgressState } from './usePhaseProgress';
import { isFatalSessionError, markFatalSessionError } from './sessionErrors';

interface UseAiRunnerOptions {
	session: LegacySession;
	sessionState: SessionSnapshot;
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
	sessionState,
	runUntilActionPhaseCore,
	syncPhaseState,
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
		const activeId = sessionState.game.activePlayerId;
		if (!session.hasAiController(activeId)) {
			return;
		}
		void session.enqueue(async () => {
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
				if (!ranTurn || fatalError !== null) {
					if (ranTurn && mountedRef.current && fatalError === null) {
						syncPhaseState(session.getSnapshot());
					}
					return;
				}
				if (!mountedRef.current) {
					syncPhaseState(session.getSnapshot());
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
			} catch (error) {
				forwardFatalError(error);
			}
			if (fatalError !== null) {
				return;
			}
		});
	}, [
		session,
		sessionState.game.activePlayerId,
		sessionState.game.phaseIndex,
		sessionState.phases,
		runUntilActionPhaseCore,
		syncPhaseState,
		mountedRef,
		onFatalSessionError,
	]);
}
