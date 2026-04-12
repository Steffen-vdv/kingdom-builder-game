import { EFFECT_COST_COLLECTORS } from '../effects';
import { runRequirement } from '../requirements';
import {
	getActionTierConfig,
	resolveActionEffects,
} from '@boardsmith/protocol';
import { getStartingTier } from '../pool/fillAlgorithm';
import type { EngineContext } from '../context';
import type { EffectDef } from '../effects';
import type { RequirementDef, RequirementFailure } from '../requirements';
import type { CostBag } from '../services';
import type { PlayerId, PlayerState } from '../state';
import type { ActionParameters } from './action_parameters';

function cloneCostBag(costBag: CostBag): CostBag {
	return { ...costBag };
}

function getActionDefinitionOrThrow(
	actionId: string,
	engineContext: EngineContext,
) {
	const actionDefinition = engineContext.actions.get(actionId);
	if (!actionDefinition) {
		throw new Error(
			`Action ${actionId} is not registered in the engine context`,
		);
	}
	return actionDefinition;
}

/**
 * Gets the player's current tier for an action.
 * Falls back to the action's starting tier if no state exists.
 */
function getCurrentTier(
	actionId: string,
	engineContext: EngineContext,
): number {
	const actionState = engineContext.activePlayer.actionStates[actionId];
	if (actionState) {
		return actionState.currentTier;
	}
	// No state - use starting tier
	const actionDefinition = engineContext.actions.get(actionId);
	return getStartingTier(actionDefinition);
}

export function applyCostsWithPassives(
	actionId: string,
	baseCosts: CostBag,
	engineContext: EngineContext,
): CostBag {
	const defaultedCosts = cloneCostBag(baseCosts);
	const actionDefinition = getActionDefinitionOrThrow(actionId, engineContext);

	// System actions and free actions have no meta-category costs
	if (actionDefinition.system || actionDefinition.free) {
		return engineContext.passives.applyCostMods(
			actionDefinition.id,
			defaultedCosts,
			engineContext,
		);
	}

	// Look up the action's meta-category
	const metaCategoryId = actionDefinition.metaCategory;
	if (!metaCategoryId) {
		// Fallback to legacy behavior for actions without metaCategory
		const primaryCostKey = engineContext.actionCostResource;
		if (primaryCostKey && defaultedCosts[primaryCostKey] === undefined) {
			defaultedCosts[primaryCostKey] =
				engineContext.services.rules.defaultActionAPCost;
		}
		return engineContext.passives.applyCostMods(
			actionDefinition.id,
			defaultedCosts,
			engineContext,
		);
	}

	// Get meta-category config and apply cost model
	const metaCategories = engineContext.actionMetaCategories;
	if (metaCategories && metaCategories.has(metaCategoryId)) {
		const metaCategory = metaCategories.get(metaCategoryId);
		const bindingResourceId = metaCategory.bindingResourceId;

		if (metaCategory.costModel === 'global') {
			// Global cost model: apply uniform cost from meta-category
			const globalCost = metaCategory.globalCostAmount ?? 0;
			if (
				Object.prototype.hasOwnProperty.call(defaultedCosts, bindingResourceId)
			) {
				const override = defaultedCosts[bindingResourceId];
				if (override !== undefined) {
					const label = actionDefinition.id ?? actionId;
					throw new Error(
						`Action ${label} may not override meta-category cost ` +
							`resource ${bindingResourceId}.`,
					);
				}
			}
			defaultedCosts[bindingResourceId] = globalCost;
		}
		// per-item cost model: baseCosts already contains the item-specific cost
	} else if (!metaCategories) {
		// Fallback to legacy behavior when no meta-categories registry
		const primaryCostKey = engineContext.actionCostResource;
		if (primaryCostKey && defaultedCosts[primaryCostKey] === undefined) {
			defaultedCosts[primaryCostKey] =
				engineContext.services.rules.defaultActionAPCost;
		}
	}

	return engineContext.passives.applyCostMods(
		actionDefinition.id,
		defaultedCosts,
		engineContext,
	);
}

export function applyEffectCostCollectors(
	resolvedEffects: EffectDef[],
	baseCosts: CostBag,
	engineContext: EngineContext,
): void {
	for (const effectDefinition of resolvedEffects) {
		if (!effectDefinition.type || !effectDefinition.method) {
			continue;
		}
		const collectorKey = `${effectDefinition.type}:${effectDefinition.method}`;
		if (!EFFECT_COST_COLLECTORS.has(collectorKey)) {
			continue;
		}
		const collector = EFFECT_COST_COLLECTORS.get(collectorKey);
		collector(effectDefinition, baseCosts, engineContext);
	}
}

export function getActionCosts<T extends string>(
	actionId: T,
	engineContext: EngineContext,
	params?: ActionParameters<T>,
	playerId?: PlayerId,
): CostBag {
	return withPlayerContext(engineContext, playerId, () => {
		const actionDefinition = getActionDefinitionOrThrow(
			actionId,
			engineContext,
		);
		const tier = getCurrentTier(actionId, engineContext);
		const tierConfig = getActionTierConfig(actionDefinition, tier);
		const baseCosts = cloneCostBag(tierConfig.costs);
		const resolved = resolveActionEffects(actionDefinition, params, tier);
		applyEffectCostCollectors(resolved.effects, baseCosts, engineContext);
		const finalCosts = applyCostsWithPassives(
			actionDefinition.id,
			baseCosts,
			engineContext,
		);
		return finalCosts;
	});
}

function withPlayerContext<T>(
	engineContext: EngineContext,
	playerId: PlayerId | undefined,
	action: () => T,
): T {
	if (!playerId) {
		return action();
	}
	const targetIndex = engineContext.game.players.findIndex(
		(player) => player.id === playerId,
	);
	if (targetIndex < 0) {
		return action();
	}
	const previousIndex = engineContext.game.currentPlayerIndex;
	if (previousIndex === targetIndex) {
		return action();
	}
	engineContext.game.currentPlayerIndex = targetIndex;
	try {
		return action();
	} finally {
		engineContext.game.currentPlayerIndex = previousIndex;
	}
}

export function getActionRequirements<T extends string>(
	actionId: T,
	engineContext: EngineContext,
	_params?: ActionParameters<T>,
	playerId?: PlayerId,
): RequirementFailure[] {
	const actionDefinition = getActionDefinitionOrThrow(actionId, engineContext);
	return withPlayerContext(engineContext, playerId, () => {
		const tier = getCurrentTier(actionId, engineContext);
		const tierConfig = getActionTierConfig(actionDefinition, tier);
		const failures: RequirementFailure[] = [];
		for (const requirement of tierConfig.requirements) {
			const requirementResult = runRequirement(
				requirement as RequirementDef,
				engineContext,
			);
			if (requirementResult === true) {
				continue;
			}
			failures.push(requirementResult);
		}
		return failures;
	});
}

export function verifyCostAffordability(
	costs: CostBag,
	playerState: PlayerState,
): true | string {
	for (const resourceId of Object.keys(costs)) {
		const requiredAmount = costs[resourceId] ?? 0;
		const availableAmount = playerState.resourceValues[resourceId] ?? 0;
		if (availableAmount < requiredAmount) {
			const shortageDetail = `Insufficient ${resourceId}: need ${requiredAmount}`;
			return `${shortageDetail}, have ${availableAmount}`;
		}
	}
	return true;
}

export function deductCostsFromPlayer(
	costs: CostBag,
	playerState: PlayerState,
	engineContext: EngineContext,
): void {
	for (const resourceId of Object.keys(costs)) {
		const amount = costs[resourceId] ?? 0;
		const currentAmount = playerState.resourceValues[resourceId] ?? 0;
		playerState.resourceValues[resourceId] = currentAmount - amount;
		engineContext.services.handleResourceChange(
			engineContext,
			playerState,
			resourceId,
		);
	}
}
