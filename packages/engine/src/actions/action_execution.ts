import { runEffects } from '../effects';
import { withResourceSourceFrames } from '../resource_sources';
import { runRequirement } from '../requirements';
import { resolveActionEffects } from '@kingdom-builder/protocol';
import type { EngineContext } from '../context';
import type { EffectDef } from '../effects';
import type { RequirementFailure } from '../requirements';
import type { ActionParameters } from './action_parameters';
import {
	applyCostsWithPassives,
	applyEffectCostCollectors,
	deductCostsFromPlayer,
	verifyCostAffordability,
} from './costs';
import { cloneEngineContext } from './context_clone';

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

interface RequirementError extends Error {
	requirementFailure?: RequirementFailure;
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
	assertSystemActionUnlocked(actionId, engineContext);
	evaluateRequirements(actionId, engineContext);
	const baseCosts = { ...(actionDefinition.baseCosts || {}) };
	const resolved = resolveActionEffects(actionDefinition, params);
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
	const passiveManager = engineContext.passives;
	withResourceSourceFrames(
		engineContext,
		(_effect, _context, resourceKey) => ({
			key: `action:${actionDefinition.id}:${resourceKey}`,
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
