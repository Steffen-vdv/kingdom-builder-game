import { useEffect } from 'react';
import {
	advance,
	type ActionParams,
	type EngineContext,
} from '@kingdom-builder/engine';
import type { Dispatch, SetStateAction } from 'react';
import type { Action } from './actionTypes';
import type { PhaseStep } from './phaseTypes';

interface UseAiRunnerOptions {
	ctx: EngineContext;
	runUntilActionPhaseCore: () => Promise<void>;
	setPhaseHistories: Dispatch<SetStateAction<Record<string, PhaseStep[]>>>;
	performRef: React.MutableRefObject<
		(action: Action, params?: ActionParams<string>) => Promise<void>
	>;
	mountedRef: React.MutableRefObject<boolean>;
}

export function useAiRunner({
	ctx,
	runUntilActionPhaseCore,
	setPhaseHistories,
	performRef,
	mountedRef,
}: UseAiRunnerOptions) {
	useEffect(() => {
		const phaseDefinition = ctx.phases[ctx.game.phaseIndex];
		if (!phaseDefinition?.action) {
			return;
		}
		const aiSystem = ctx.aiSystem;
		const activeId = ctx.activePlayer.id;
		if (!aiSystem?.has(activeId)) {
			return;
		}
		void ctx.enqueue(async () => {
			await aiSystem.run(activeId, ctx, {
				performAction: async (
					actionId: string,
					engineCtx: EngineContext,
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
				advance: (engineCtx: EngineContext) => {
					advance(engineCtx);
				},
			});
			if (!mountedRef.current) {
				return;
			}
			setPhaseHistories({});
			await runUntilActionPhaseCore();
		});
	}, [
		ctx.activePlayer.id,
		ctx.aiSystem,
		ctx.game.phaseIndex,
		runUntilActionPhaseCore,
		setPhaseHistories,
		performRef,
		ctx,
		mountedRef,
	]);
}
