import { EFFECT_COST_COLLECTORS } from '../effects';
import { runRequirement } from '../requirements';
import { resolveActionEffects } from '@kingdom-builder/protocol';
import type { EngineContext } from '../context';
import type { EffectDef } from '../effects';
import type { RequirementFailure } from '../requirements';
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

export function applyCostsWithPassives(
	actionId: string,
	baseCosts: CostBag,
	engineContext: EngineContext,
): CostBag {
	const defaultedCosts = cloneCostBag(baseCosts);
	const actionDefinition = getActionDefinitionOrThrow(actionId, engineContext);
	const primaryCostKey = engineContext.actionCostResource;
	if (primaryCostKey && defaultedCosts[primaryCostKey] === undefined) {
		defaultedCosts[primaryCostKey] = actionDefinition.system
			? 0
			: engineContext.services.rules.defaultActionAPCost;
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
		const baseCosts = cloneCostBag(actionDefinition.baseCosts || {});
		const resolved = resolveActionEffects(actionDefinition, params);
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
		const failures: RequirementFailure[] = [];
		for (const requirement of actionDefinition.requirements || []) {
			const requirementResult = runRequirement(requirement, engineContext);
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
	for (const resourceKey of Object.keys(costs)) {
		const requiredAmount = costs[resourceKey] ?? 0;
		const availableAmount = playerState.resources[resourceKey] ?? 0;
		if (availableAmount < requiredAmount) {
			const shortageDetail = `Insufficient ${resourceKey}: need ${requiredAmount}`;
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
	for (const resourceKey of Object.keys(costs)) {
		const amount = costs[resourceKey] ?? 0;
		playerState.resources[resourceKey] =
			(playerState.resources[resourceKey] || 0) - amount;
		engineContext.services.handleResourceChange(
			engineContext,
			playerState,
			resourceKey,
		);
	}
}
