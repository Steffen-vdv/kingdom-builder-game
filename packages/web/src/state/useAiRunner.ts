import { useEffect } from 'react';
import {
	type ActionParams,
	type EngineSession,
	type EngineSessionSnapshot,
} from '@kingdom-builder/engine';
import type { Dispatch, SetStateAction } from 'react';
import type { Action } from './actionTypes';
import type { PhaseStep } from './phaseTypes';
import { getLegacySessionContext } from './getLegacySessionContext';

interface UseAiRunnerOptions {
	session: EngineSession;
	sessionState: EngineSessionSnapshot;
	runUntilActionPhaseCore: () => Promise<void>;
	setPhaseHistories: Dispatch<SetStateAction<Record<string, PhaseStep[]>>>;
	performRef: React.MutableRefObject<
		(action: Action, params?: ActionParams<string>) => Promise<void>
	>;
	mountedRef: React.MutableRefObject<boolean>;
}

export function useAiRunner({
	session,
	sessionState,
	runUntilActionPhaseCore,
	setPhaseHistories,
	performRef,
	mountedRef,
}: UseAiRunnerOptions) {
	useEffect(() => {
		const phaseDefinition = sessionState.phases[sessionState.game.phaseIndex];
		if (!phaseDefinition?.action) {
			return;
		}
		const context = getLegacySessionContext(session);
		const aiSystem = context.aiSystem;
		const activeId = sessionState.game.activePlayerId;
		if (!aiSystem?.has(activeId)) {
			return;
		}
		void session.enqueue(async () => {
			await aiSystem.run(activeId, context, {
				performAction: async (
					actionId: string,
					engineCtx,
					params?: ActionParams<string>,
				) => {
					const definition = engineCtx.actions.get(actionId);
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
					session.advancePhase();
				},
			});
			if (!mountedRef.current) {
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
	]);
}
