import type { EngineContext } from '../context';
import type { PlayerId } from '../state';
import type { ActionParams, AdvanceResult } from '../index';
import type { ActionTrace } from '../log';

export const TAX_ACTION_ID = 'tax';

type PerformActionResult = ActionTrace[] | void;

export type PerformActionFn = <T extends string>(
	actionId: T,
	engineContext: EngineContext,
	params?: ActionParams<T>,
) => PerformActionResult | Promise<PerformActionResult>;

type AdvanceResultValue = AdvanceResult | void;

export type AdvanceFn = (
	engineContext: EngineContext,
) => AdvanceResultValue | Promise<AdvanceResultValue>;

export type ContinueAfterActionFn = (
	actionId: string,
	engineContext: EngineContext,
	result: PerformActionResult,
) => boolean | Promise<boolean>;

export type ShouldAdvancePhaseFn = (
	engineContext: EngineContext,
) => boolean | Promise<boolean>;

export interface AIDependencies {
	performAction: PerformActionFn;
	advance: AdvanceFn;
	continueAfterAction?: ContinueAfterActionFn;
	shouldAdvancePhase?: ShouldAdvancePhaseFn;
}

export type AIController = (
	engineContext: EngineContext,
	dependencies: AIDependencies,
) => Promise<void> | void;

export class AISystem {
	private controllers = new Map<PlayerId, AIController>();

	constructor(private dependencies: AIDependencies) {}

	register(playerId: PlayerId, controller: AIController) {
		this.controllers.set(playerId, controller);
	}

	has(playerId: PlayerId) {
		return this.controllers.has(playerId);
	}

	async run(
		playerId: PlayerId,
		engineContext: EngineContext,
		overrides?: Partial<AIDependencies>,
	) {
		const controller = this.controllers.get(playerId);
		if (!controller) {
			return false;
		}
		const dependencies = {
			...this.dependencies,
			...(overrides || {}),
		} as AIDependencies;
		if (!dependencies.continueAfterAction) {
			dependencies.continueAfterAction = () => true;
		}
		if (!dependencies.shouldAdvancePhase) {
			dependencies.shouldAdvancePhase = () => true;
		}
		await controller(engineContext, dependencies);
		return true;
	}
}

export function createAISystem(dependencies: AIDependencies) {
	return new AISystem(dependencies);
}

export function createTaxCollectorController(playerId: PlayerId): AIController {
	return async (engineContext, dependencies) => {
		if (engineContext.activePlayer.id !== playerId) {
			return;
		}
		const currentPhaseDefinition =
			engineContext.phases[engineContext.game.phaseIndex];
		if (!currentPhaseDefinition?.action) {
			return;
		}
		const actionPointResourceKey = engineContext.actionCostResource;
		if (!actionPointResourceKey) {
			return;
		}

		const continueAfterAction =
			dependencies.continueAfterAction ?? (() => true);
		const shouldAdvancePhase = dependencies.shouldAdvancePhase ?? (() => true);

		const finishActionPhaseAsync = async () => {
			if (engineContext.activePlayer.id !== playerId) {
				return;
			}
			const activePhase = engineContext.phases[engineContext.game.phaseIndex];
			if (!activePhase?.action) {
				return;
			}
			const remaining =
				engineContext.activePlayer.resources[actionPointResourceKey];
			if (typeof remaining === 'number' && remaining > 0) {
				engineContext.activePlayer.resources[actionPointResourceKey] = 0;
			}
			const shouldAdvance = await shouldAdvancePhase(engineContext);
			if (!shouldAdvance) {
				return;
			}
			await dependencies.advance(engineContext);
		};

		const definition = engineContext.actions.get(TAX_ACTION_ID);
		if (!definition) {
			await finishActionPhaseAsync();
			return;
		}
		if (
			definition.system &&
			!engineContext.activePlayer.actions.has(TAX_ACTION_ID)
		) {
			await finishActionPhaseAsync();
			return;
		}

		while (
			engineContext.activePlayer.id === playerId &&
			engineContext.phases[engineContext.game.phaseIndex]?.action &&
			(engineContext.activePlayer.resources[actionPointResourceKey] ?? 0) > 0
		) {
			try {
				const result = await dependencies.performAction(
					TAX_ACTION_ID,
					engineContext,
				);
				const shouldContinue = await continueAfterAction(
					TAX_ACTION_ID,
					engineContext,
					result,
				);
				if (!shouldContinue) {
					if (
						engineContext.activePlayer.id === playerId &&
						(engineContext.activePlayer.resources[actionPointResourceKey] ??
							0) === 0
					) {
						await finishActionPhaseAsync();
					}
					return;
				}
			} catch (error) {
				void error;
				await finishActionPhaseAsync();
				return;
			}
		}

		if (
			engineContext.activePlayer.id === playerId &&
			engineContext.phases[engineContext.game.phaseIndex]?.action &&
			(engineContext.activePlayer.resources[actionPointResourceKey] ?? 0) === 0
		) {
			await finishActionPhaseAsync();
		}
	};
}
