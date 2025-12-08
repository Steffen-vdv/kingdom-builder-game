import type { EngineContext } from '../context';
import type { PlayerId } from '../state';
import type { ActionParams, AdvanceResult } from '../index';
import type { ActionTrace } from '../log';
import { getResourceValue, setResourceValue } from '../resource';

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
		// actionCostResource IS the Resource ID (e.g. 'resource:core:ap')
		const actionPointResourceId = engineContext.actionCostResource;
		if (!actionPointResourceId) {
			return;
		}
		const catalog = engineContext.resourceCatalog;
		const readActionPoints = () =>
			getResourceValue(engineContext.activePlayer, actionPointResourceId);
		const writeActionPoints = (value: number) => {
			setResourceValue(
				engineContext,
				engineContext.activePlayer,
				catalog,
				actionPointResourceId,
				value,
				{
					suppressRecentEntry: true,
				},
			);
		};

		if (!actionPointResourceId) {
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
			const remaining = readActionPoints();
			if (typeof remaining === 'number' && remaining > 0) {
				writeActionPoints(0);
			}
			const shouldAdvance = await shouldAdvancePhase(engineContext);
			if (!shouldAdvance) {
				return;
			}
			await dependencies.advance(engineContext);
		};

		const definition = engineContext.actions.has(TAX_ACTION_ID)
			? engineContext.actions.get(TAX_ACTION_ID)
			: undefined;
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
			readActionPoints() > 0
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
					return;
				}
			} catch (error) {
				// Re-throw unexpected errors (engine bugs) so the frontend can
				// show an error page. Only swallow expected failures like
				// requirement failures or affordability issues.
				const errorRecord = error as Record<string, unknown>;
				const isRequirementFailure = 'requirementFailure' in errorRecord;
				const isAffordabilityFailure =
					error instanceof Error &&
					(error.message.includes('Cannot afford') ||
						error.message.includes('Requirement not met'));
				if (!isRequirementFailure && !isAffordabilityFailure) {
					throw error;
				}
				await finishActionPhaseAsync();
				return;
			}
		}

		if (
			engineContext.activePlayer.id === playerId &&
			engineContext.phases[engineContext.game.phaseIndex]?.action &&
			readActionPoints() === 0
		) {
			await finishActionPhaseAsync();
		}
	};
}
