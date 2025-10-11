import { useEffect } from 'react';
import { type ActionParams } from '@kingdom-builder/engine';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { Action } from './actionTypes';
import type { SessionSnapshot } from '@kingdom-builder/protocol/session';
import type { LegacySession } from './sessionTypes';
import type { PhaseProgressState, PhaseStep } from './phaseTypes';

interface UseAiRunnerOptions {
	session: LegacySession;
	sessionState: SessionSnapshot;
	runUntilActionPhaseCore: () => Promise<void>;
	setPhaseHistories: Dispatch<SetStateAction<Record<string, PhaseStep[]>>>;
	syncPhaseState: (
		snapshot: SessionSnapshot,
		overrides?: Partial<PhaseProgressState>,
	) => void;
	performRef: MutableRefObject<
		(action: Action, params?: ActionParams<string>) => Promise<void>
	>;
	mountedRef: MutableRefObject<boolean>;
}

export function useAiRunner({
	session,
	sessionState,
	runUntilActionPhaseCore,
	setPhaseHistories,
	syncPhaseState,
	performRef,
	mountedRef,
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
			setPhaseHistories({});
			syncPhaseState(session.getSnapshot(), {
				isAdvancing: true,
				canEndTurn: false,
			});
			await runUntilActionPhaseCore();
		});
	}, [
		session,
		sessionState.game.activePlayerId,
		sessionState.game.phaseIndex,
		sessionState.phases,
		runUntilActionPhaseCore,
		setPhaseHistories,
		syncPhaseState,
		performRef,
		mountedRef,
	]);
}
