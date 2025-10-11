import { useEffect, useRef } from 'react';
import { type ActionParams } from '@kingdom-builder/engine';
import type { Action } from './actionTypes';
import type { SessionSnapshot } from '@kingdom-builder/protocol/session';
import type { LegacySession } from './sessionTypes';
import type { PhaseProgressState } from './usePhaseProgress';

interface UseAiRunnerOptions {
	session: LegacySession;
	sessionState: SessionSnapshot;
	runUntilActionPhaseCore: () => Promise<void>;
	syncPhaseState: (
		snapshot: SessionSnapshot,
		overrides?: Partial<PhaseProgressState>,
	) => void;
	performRef: React.MutableRefObject<
		(action: Action, params?: ActionParams<string>) => Promise<void>
	>;
	mountedRef: React.MutableRefObject<boolean>;
	onFatalSessionError?: (error: unknown) => void;
}

export function useAiRunner({
	session,
	sessionState,
	runUntilActionPhaseCore,
	syncPhaseState,
	performRef,
	mountedRef,
	onFatalSessionError,
}: UseAiRunnerOptions) {
	const fatalErrorRef = useRef(false);

	useEffect(() => {
		if (fatalErrorRef.current) {
			return;
		}
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
			if (fatalErrorRef.current) {
				return;
			}
			try {
				const ranTurn = await session.runAiTurn(activeId, {
					performAction: async (
						actionId: string,
						_ignored: unknown,
						params?: ActionParams<string>,
					) => {
						const definition = session.getActionDefinition(actionId);
						if (!definition) {
							throw new Error(`Unknown action ${String(actionId)} for AI`);
						}
						const action: Action = {
							id: definition.id,
							name: definition.name,
						};
						if (definition.system !== undefined) {
							action.system = definition.system;
						}
						await performRef.current(action, params as Record<string, unknown>);
					},
					advance: () => {
						const snapshot = session.getSnapshot();
						if (snapshot.game.conclusion) {
							return;
						}
						session.advancePhase();
					},
				});
				if (!ranTurn || !mountedRef.current) {
					return;
				}
				syncPhaseState(session.getSnapshot(), {
					isAdvancing: true,
					canEndTurn: false,
				});
				await runUntilActionPhaseCore();
			} catch (error) {
				fatalErrorRef.current = true;
				if (onFatalSessionError) {
					onFatalSessionError(error);
					return;
				}
				throw error;
			}
		});
	}, [
		session,
		sessionState.game.activePlayerId,
		sessionState.game.phaseIndex,
		sessionState.phases,
		runUntilActionPhaseCore,
		syncPhaseState,
		performRef,
		mountedRef,
		onFatalSessionError,
	]);
}
