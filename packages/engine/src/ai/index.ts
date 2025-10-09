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
	deps: AIDependencies,
) => Promise<void> | void;

export class AISystem {
	private controllers = new Map<PlayerId, AIController>();

	constructor(private deps: AIDependencies) {}

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
		const deps = { ...this.deps, ...(overrides || {}) } as AIDependencies;
		await controller(engineContext, deps);
		return true;
	}
}

export function createAISystem(deps: AIDependencies) {
	return new AISystem(deps);
}

export function createTaxCollectorController(playerId: PlayerId): AIController {
	return async (engineContext, deps) => {
		if (engineContext.activePlayer.id !== playerId) {
			return;
		}
		const phase = engineContext.phases[engineContext.game.phaseIndex];
		if (!phase?.action) {
			return;
		}
		const apKey = engineContext.actionCostResource;
		if (!apKey) {
			return;
		}

		const finishActionPhase = async () => {
			if (engineContext.activePlayer.id !== playerId) {
				return;
			}
			if (!engineContext.phases[engineContext.game.phaseIndex]?.action) {
				return;
			}
			const remaining = engineContext.activePlayer.resources[apKey];
			if (typeof remaining === 'number' && remaining > 0) {
				engineContext.activePlayer.resources[apKey] = 0;
			}
			await deps.advance(engineContext);
		};

		const definition = engineContext.actions.get(TAX_ACTION_ID);
		if (!definition) {
			await finishActionPhase();
			return;
		}
		if (
			definition.system &&
			!engineContext.activePlayer.actions.has(TAX_ACTION_ID)
		) {
			await finishActionPhase();
			return;
		}

		while (
			engineContext.activePlayer.id === playerId &&
			engineContext.phases[engineContext.game.phaseIndex]?.action &&
			(engineContext.activePlayer.resources[apKey] ?? 0) > 0
		) {
			try {
				await deps.performAction(TAX_ACTION_ID, engineContext);
			} catch (err) {
				await finishActionPhase();
				return;
			}
		}

		if (
			engineContext.activePlayer.id === playerId &&
			engineContext.phases[engineContext.game.phaseIndex]?.action &&
			(engineContext.activePlayer.resources[apKey] ?? 0) === 0
		) {
			await finishActionPhase();
		}
	};
}
