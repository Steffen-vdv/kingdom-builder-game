import { EFFECT_COST_COLLECTORS } from '../effects';
import { runRequirement } from '../requirements';
import type { EffectDef } from '@kingdom-builder/protocol';
import type { EngineContext } from '../context';
import type { CostBag } from '../services';
import type { PlayerState } from '../state';
import type { ActionParameters } from './action_parameters';
import { resolveActionEffects } from './effect_groups';

function cloneCostBag(costBag: CostBag): CostBag {
	return { ...costBag };
}

export function applyCostsWithPassives(
	actionId: string,
	baseCosts: CostBag,
	engineContext: EngineContext,
): CostBag {
	const defaultedCosts = cloneCostBag(baseCosts);
	const actionDefinition = engineContext.actions.get(actionId);
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
): CostBag {
	const actionDefinition = engineContext.actions.get(actionId);
	const baseCosts = cloneCostBag(actionDefinition.baseCosts || {});
	const resolved = resolveActionEffects(actionDefinition, params);
	applyEffectCostCollectors(resolved.effects, baseCosts, engineContext);
	const finalCosts = applyCostsWithPassives(
		actionDefinition.id,
		baseCosts,
		engineContext,
	);
	return finalCosts;
}

export function getActionRequirements<T extends string>(
	actionId: T,
	engineContext: EngineContext,
	_params?: ActionParameters<T>,
): string[] {
	const actionDefinition = engineContext.actions.get(actionId);
	const failures: string[] = [];
	for (const requirement of actionDefinition.requirements || []) {
		const requirementResult = runRequirement(requirement, engineContext);
		if (requirementResult === true) {
			continue;
		}
		failures.push(String(requirementResult));
	}
	return failures;
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
): void {
	for (const resourceKey of Object.keys(costs)) {
		const amount = costs[resourceKey] ?? 0;
		playerState.resources[resourceKey] =
			(playerState.resources[resourceKey] || 0) - amount;
	}
}
