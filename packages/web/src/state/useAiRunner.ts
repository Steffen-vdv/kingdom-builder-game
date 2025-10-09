import { useEffect } from 'react';
import {
	type ActionParams,
	type EngineSession,
	type EngineSessionSnapshot,
} from '@kingdom-builder/engine';
import type { Dispatch, SetStateAction } from 'react';
import type { Action } from './actionTypes';
import type { PhaseStep } from './phaseTypes';

interface UseAiRunnerOptions {
	session: EngineSession;
	sessionState: EngineSessionSnapshot;
	runUntilActionPhaseCore: () => Promise<void>;
	setPhaseHistories: Dispatch<SetStateAction<Record<string, PhaseStep[]>>>;
	performRef: React.MutableRefObject<
		(action: Action, params?: ActionParams<string>) => Promise<void>
	>;
	mountedRef: React.MutableRefObject<boolean>;
	getLatestSnapshot: () => EngineSessionSnapshot;
	advancePhase: () => Promise<void>;
}

export function useAiRunner({
	session,
	sessionState,
	runUntilActionPhaseCore,
	setPhaseHistories,
	performRef,
	mountedRef,
	getLatestSnapshot,
	advancePhase,
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
				advance: async () => {
					const snapshot = getLatestSnapshot();
					if (snapshot.game.conclusion) {
						return;
					}
					await advancePhase();
				},
			});
			if (!ranTurn || !mountedRef.current) {
				return;
			}
			setPhaseHistories({});
			await runUntilActionPhaseCore();
		});
	}, [
		session,
		sessionState.game.activePlayerId,
		sessionState.game.phaseIndex,
		sessionState.phases,
		runUntilActionPhaseCore,
		setPhaseHistories,
		performRef,
		mountedRef,
		getLatestSnapshot,
		advancePhase,
	]);
}
