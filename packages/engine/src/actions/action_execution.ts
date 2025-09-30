import { runEffects } from '../effects';
import { applyParamsToEffects } from '../utils';
import { withStatSourceFrames } from '../stat_sources';
import { runRequirement } from '../requirements';
import type { EngineContext } from '../context';
import type { EffectDef } from '../effects';
import type { ActionParameters } from './action_parameters';
import {
	applyCostsWithPassives,
	applyEffectCostCollectors,
	deductCostsFromPlayer,
	verifyCostAffordability,
} from './costs';

function assertSystemActionUnlocked(
	actionId: string,
	engineContext: EngineContext,
): void {
	const actionDefinition = engineContext.actions.get(actionId);
	if (!actionDefinition.system) {
		return;
	}
	const isUnlocked = engineContext.activePlayer.actions.has(actionId);
	if (isUnlocked) {
		return;
	}
	throw new Error(`Action ${actionId} is locked`);
}

function evaluateRequirements(
	actionId: string,
	engineContext: EngineContext,
): void {
	const actionDefinition = engineContext.actions.get(actionId);
	for (const requirement of actionDefinition.requirements || []) {
		const requirementResult = runRequirement(requirement, engineContext);
		if (requirementResult === true) {
			continue;
		}
		throw new Error(String(requirementResult));
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

export function performAction<T extends string>(
	actionId: T,
	engineContext: EngineContext,
	params?: ActionParameters<T>,
) {
	engineContext.actionTraces = [];
	const actionDefinition = engineContext.actions.get(actionId);
	const player = engineContext.activePlayer;
	assertSystemActionUnlocked(actionId, engineContext);
	evaluateRequirements(actionId, engineContext);
	const baseCosts = { ...(actionDefinition.baseCosts || {}) };
	const resolvedEffects = applyParamsToEffects(
		actionDefinition.effects,
		params || {},
	);
	const pendingBuildingIds = collectPendingBuildingAdds(resolvedEffects);
	assertBuildingsNotYetConstructed(pendingBuildingIds, engineContext);
	applyEffectCostCollectors(resolvedEffects, baseCosts, engineContext);
	const finalCosts = applyCostsWithPassives(
		actionDefinition.id,
		baseCosts,
		engineContext,
	);
	const affordability = verifyCostAffordability(finalCosts, player);
	if (affordability !== true) {
		throw new Error(affordability);
	}
	deductCostsFromPlayer(finalCosts, player, engineContext);
	const passiveManager = engineContext.passives;
	withStatSourceFrames(
		engineContext,
		(_effect, _context, statKey) => ({
			key: `action:${actionDefinition.id}:${statKey}`,
			kind: 'action',
			id: actionDefinition.id,
			detail: 'Resolution',
			longevity: 'permanent',
		}),
		() => {
			runEffects(resolvedEffects, engineContext);
			passiveManager.runResultMods(actionDefinition.id, engineContext);
		},
	);
	const actionTraces = engineContext.actionTraces;
	engineContext.actionTraces = [];
	return actionTraces;
}
