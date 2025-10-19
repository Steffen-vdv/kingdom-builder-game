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

export interface AIDependencies {
	performAction: PerformActionFn;
	advance: AdvanceFn;
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

		const finishActionPhaseAsync = async () => {
			if (engineContext.activePlayer.id !== playerId) {
				return;
			}
			if (!engineContext.phases[engineContext.game.phaseIndex]?.action) {
				return;
			}
			const remaining =
				engineContext.activePlayer.resources[actionPointResourceKey];
			if (typeof remaining === 'number' && remaining > 0) {
				engineContext.activePlayer.resources[actionPointResourceKey] = 0;
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

		const remaining =
			engineContext.activePlayer.resources[actionPointResourceKey] ?? 0;
		if (remaining <= 0) {
			await finishActionPhaseAsync();
			return;
		}

		try {
			await dependencies.performAction(TAX_ACTION_ID, engineContext);
		} catch (error) {
			void error;
			await finishActionPhaseAsync();
		}
	};
}
