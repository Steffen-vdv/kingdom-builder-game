import { runEffects } from '../effects';
import { withResourceSourceFrames } from '../resource_sources';
import { runRequirement } from '../requirements';
import {
	getActionTierConfig,
	resolveActionEffects,
} from '@boardsmith/protocol';
import type { EngineContext } from '../context';
import type { EffectDef } from '../effects';
import type { RequirementDef, RequirementFailure } from '../requirements';
import type { ActionParameters } from './action_parameters';
import {
	applyCostsWithPassives,
	applyEffectCostCollectors,
	deductCostsFromPlayer,
	verifyCostAffordability,
} from './costs';
import { cloneEngineContext } from './context_clone';
import { getStartingTier, getMaxTier } from '../pool/fillAlgorithm';

/**
 * Validates that an action can be performed by a player.
 *
 * - System actions are engine-only and can NEVER be performed via this path.
 *   They must be executed via runSystemActionEffects() internally.
 * - Locked actions must be in the player's actions set to be performed.
 * - Normal actions are always allowed.
 */
function assertActionAvailable(
	actionId: string,
	engineContext: EngineContext,
): void {
	const actionDefinition = engineContext.actions.get(actionId);

	// System actions are never executable by players
	if (actionDefinition.system) {
		throw new Error(`System action "${actionId}" cannot be performed directly`);
	}

	// Check action state - must be available (not locked, not pool-locked)
	const actionState = engineContext.activePlayer.actionStates[actionId];
	if (actionState) {
		if (actionState.locked) {
			throw new Error(`Action ${actionId} is locked`);
		}
		if (actionState.poolLocked) {
			throw new Error(`Action ${actionId} is not in the active pool`);
		}
		if (actionState.exhausted) {
			throw new Error(`Action ${actionId} is exhausted`);
		}
		if (
			actionDefinition.maxUsesPerTurn !== undefined &&
			actionState.usesThisTurn >= actionDefinition.maxUsesPerTurn
		) {
			throw new Error(`Action ${actionId} has reached its per-turn limit`);
		}
	} else if (actionDefinition.locked) {
		// No state but definition says locked - treat as locked
		throw new Error(`Action ${actionId} is locked`);
	}

	// Normal actions (neither system nor locked) are always allowed
}

interface RequirementError extends Error {
	requirementFailure?: RequirementFailure;
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

/**
 * Tracks binding resource spent for pooled meta-categories.
 * This drives tier progression curves in the pool fill algorithm.
 */
function trackMetaCategoryBindingSpent(
	actionDefinition: { metaCategory?: string },
	finalCosts: Record<string, number | undefined>,
	engineContext: EngineContext,
): void {
	const metaCategoryId = actionDefinition.metaCategory;
	if (!metaCategoryId) {
		return;
	}
	const metaCategories = engineContext.actionMetaCategories;
	if (!metaCategories?.has(metaCategoryId)) {
		return;
	}
	const metaCategory = metaCategories.get(metaCategoryId);
	// Only track for pooled meta-categories
	if (!metaCategory.pool) {
		return;
	}
	const bindingResourceId = metaCategory.bindingResourceId;
	const bindingAmount = finalCosts[bindingResourceId] ?? 0;
	if (bindingAmount <= 0) {
		return;
	}
	const player = engineContext.activePlayer;
	const currentSpent = player.metaCategoryBindingSpent[metaCategoryId] ?? 0;
	player.metaCategoryBindingSpent[metaCategoryId] =
		currentSpent + bindingAmount;
}

function evaluateRequirements(
	actionId: string,
	engineContext: EngineContext,
): void {
	const actionDefinition = engineContext.actions.get(actionId);
	const tier = getCurrentTier(actionId, engineContext);
	const tierConfig = getActionTierConfig(actionDefinition, tier);
	for (const requirement of tierConfig.requirements) {
		const requirementResult = runRequirement(
			requirement as RequirementDef,
			engineContext,
		);
		if (requirementResult === true) {
			continue;
		}
		const message = requirementResult.message ?? 'Requirement not met';
		const error = new Error(message) as RequirementError;
		error.requirementFailure = requirementResult;
		throw error;
	}
}

function collectPendingBuildingAdds(resolvedEffects: EffectDef[]): string[] {
	const pendingBuildingIds: string[] = [];
	for (const effectDefinition of resolvedEffects) {
		if (effectDefinition.type !== 'building') {
			continue;
		}
		if (effectDefinition.method !== 'add') {
			continue;
		}
		const buildingId = effectDefinition.params?.['id'];
		if (typeof buildingId !== 'string') {
			continue;
		}
		pendingBuildingIds.push(buildingId);
	}
	return pendingBuildingIds;
}

function assertBuildingsNotYetConstructed(
	buildingIds: string[],
	engineContext: EngineContext,
): void {
	for (const buildingId of buildingIds) {
		if (!engineContext.activePlayer.buildings.has(buildingId)) {
			continue;
		}
		throw new Error(`Building ${buildingId} already built`);
	}
}

function executeAction<T extends string>(
	actionId: T,
	engineContext: EngineContext,
	params?: ActionParameters<T>,
) {
	if (engineContext.game.conclusion) {
		throw new Error('Game already concluded');
	}
	engineContext.actionTraces = [];
	const actionDefinition = engineContext.actions.get(actionId);
	assertActionAvailable(actionId, engineContext);
	evaluateRequirements(actionId, engineContext);
	const tier = getCurrentTier(actionId, engineContext);
	const tierConfig = getActionTierConfig(actionDefinition, tier);
	const baseCosts = { ...tierConfig.costs };
	const resolved = resolveActionEffects(actionDefinition, params, tier);
	if (resolved.missingSelections.length > 0) {
		const formatted = resolved.missingSelections
			.map((id) => `"${id}"`)
			.join(', ');
		const suffix = resolved.missingSelections.length > 1 ? 'groups' : 'group';
		const missingSelectionMessage =
			`Action ${actionDefinition.id} requires a selection for effect ` +
			`${suffix} ${formatted}`;
		throw new Error(missingSelectionMessage);
	}
	const pendingBuildingIds = collectPendingBuildingAdds(resolved.effects);
	assertBuildingsNotYetConstructed(pendingBuildingIds, engineContext);
	applyEffectCostCollectors(resolved.effects, baseCosts, engineContext);
	const finalCosts = applyCostsWithPassives(
		actionDefinition.id,
		baseCosts,
		engineContext,
	);
	const affordability = verifyCostAffordability(
		finalCosts,
		engineContext.activePlayer,
	);
	if (affordability !== true) {
		throw new Error(affordability);
	}
	deductCostsFromPlayer(finalCosts, engineContext.activePlayer, engineContext);
	trackMetaCategoryBindingSpent(actionDefinition, finalCosts, engineContext);
	const passiveManager = engineContext.passives;
	withResourceSourceFrames(
		engineContext,
		(_effect, _context, resourceKey) => ({
			sourceKey: `action:${actionDefinition.id}:${resourceKey}`,
			kind: 'action',
			id: actionDefinition.id,
			detail: 'Resolution',
			longevity: 'permanent',
		}),
		() => {
			runEffects(resolved.effects, engineContext);
			passiveManager.runResultMods(actionDefinition.id, engineContext);
		},
	);
	if (actionDefinition.oneTime) {
		const actionState = engineContext.activePlayer.actionStates[actionId];
		if (actionState) {
			const maxTier = getMaxTier(actionDefinition);
			if (actionState.currentTier >= maxTier) {
				actionState.exhausted = true;
			}
		}
	}
	const postActionState = engineContext.activePlayer.actionStates[actionId];
	if (postActionState) {
		postActionState.usesThisTurn += 1;
	}
	const actionTraces = engineContext.actionTraces;
	engineContext.actionTraces = [];
	return actionTraces;
}

export function performAction<T extends string>(
	actionId: T,
	engineContext: EngineContext,
	params?: ActionParameters<T>,
) {
	return executeAction(actionId, engineContext, params);
}

export function simulateAction<T extends string>(
	actionId: T,
	engineContext: EngineContext,
	params?: ActionParameters<T>,
) {
	const simulatedContext = cloneEngineContext(engineContext);
	return executeAction(actionId, simulatedContext, params);
}
