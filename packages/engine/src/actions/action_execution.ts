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
import { cloneEngineContext } from './context_clone';
import {
	coerceActionEffectGroupChoices,
	getActionEffectGroups,
} from './effect_groups';

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

function ensureEffectGroupSelections(
	actionId: string,
	groups: ReturnType<typeof getActionEffectGroups>,
	choices: ReturnType<typeof coerceActionEffectGroupChoices>,
) {
	if (groups.length === 0) {
		return;
	}
	for (const group of groups) {
		if (choices[group.id]) {
			continue;
		}
		throw new Error(
			`Action ${actionId} requires a selection for effect group "${group.id}"`,
		);
	}
}

function executeAction<T extends string>(
	actionId: T,
	engineContext: EngineContext,
	params?: ActionParameters<T>,
) {
	engineContext.actionTraces = [];
	const actionDefinition = engineContext.actions.get(actionId);
	assertSystemActionUnlocked(actionId, engineContext);
	evaluateRequirements(actionId, engineContext);
	const baseCosts = { ...(actionDefinition.baseCosts || {}) };
	const resolvedEffects = applyParamsToEffects(
		actionDefinition.effects,
		params || {},
	);
	const effectGroups = getActionEffectGroups(
		actionDefinition.id,
		engineContext,
	);
	const choiceMap = coerceActionEffectGroupChoices(
		params && typeof params === 'object'
			? (params as Record<string, unknown>)['choices']
			: undefined,
	);
	ensureEffectGroupSelections(actionDefinition.id, effectGroups, choiceMap);
	const pendingBuildingIds = collectPendingBuildingAdds(resolvedEffects);
	assertBuildingsNotYetConstructed(pendingBuildingIds, engineContext);
	applyEffectCostCollectors(resolvedEffects, baseCosts, engineContext);
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
	deductCostsFromPlayer(finalCosts, engineContext.activePlayer);
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
			if (effectGroups.length > 0) {
				for (const group of effectGroups) {
					const selection = choiceMap[group.id];
					if (!selection) {
						continue;
					}
					const option = group.options.find(
						(candidate) => candidate.id === selection.optionId,
					);
					if (!option) {
						throw new Error(
							`Unknown option "${selection.optionId}" for effect group "${group.id}" on action ${actionDefinition.id}`,
						);
					}
					const mergedParams = {
						...(params || {}),
						...(selection.params || {}),
					} as Record<string, unknown>;
					const followUp = applyParamsToEffects(
						[
							{
								type: 'action',
								method: 'perform',
								params: {
									id: option.actionId,
									...(option.params || {}),
								},
							},
						],
						mergedParams,
					);
					runEffects(followUp, engineContext);
				}
			}
			passiveManager.runResultMods(actionDefinition.id, engineContext);
		},
	);
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
