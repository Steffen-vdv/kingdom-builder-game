import { describe, it, expect } from 'vitest';
import {
	advance,
	getActionCosts,
	performAction,
	resolveActionEffects,
	type EffectDef,
} from '../../src';
import { createTestEngine } from '../helpers';
import { Resource as CResource, PhaseId } from '@kingdom-builder/contents';
import { type ResourceAmountParamsResult } from '../helpers/resourceParams.ts';
import type { EffectConfig } from '@kingdom-builder/protocol';

interface EffectGroupOption {
	id: string;
	actionId: string;
	params?: Record<string, unknown>;
}

interface EffectGroup {
	id: string;
	options: EffectGroupOption[];
}

function isEffectGroup(effect: unknown): effect is EffectGroup {
	return (
		typeof effect === 'object' &&
		effect !== null &&
		Array.isArray((effect as { options?: unknown }).options)
	);
}

// Helper to get all effects from an action's tiers
function getAllEffectsFromAction(action: {
	tiers: Record<string, { effects: EffectConfig[] }>;
}): EffectConfig[] {
	const effects: EffectConfig[] = [];
	for (const tier of Object.values(action.tiers)) {
		effects.push(...tier.effects);
	}
	return effects;
}

function toMain(engineContext: ReturnType<typeof createTestEngine>) {
	while (engineContext.game.currentPhase !== PhaseId.Main) {
		advance(engineContext);
	}
}

describe('royal decree action effect group', () => {
	it('expands, tills and develops the chosen project', () => {
		const engineContext = createTestEngine();
		toMain(engineContext);

		const [actionId, royalDecree] = engineContext.actions
			.entries()
			.find(([, definition]) =>
				getAllEffectsFromAction(definition).some(isEffectGroup),
			)!;
		const allRoyalDecreeEffects = getAllEffectsFromAction(royalDecree);
		const group = allRoyalDecreeEffects.find(isEffectGroup)!;
		const chosenOption = group.options[0];
		const optionId = chosenOption.id;
		const nestedAction = engineContext.actions.get(chosenOption.actionId);
		if (!nestedAction) {
			throw new Error(
				`Missing nested action definition for id "${chosenOption.actionId}".`,
			);
		}
		const nestedActionEffects = getAllEffectsFromAction(nestedAction);
		const nestedDevelopmentEffect = nestedActionEffects.find(
			(candidate) =>
				candidate.type === 'development' && candidate.method === 'add',
		);
		if (!nestedDevelopmentEffect) {
			throw new Error(
				`Missing development:add effect for action "${nestedAction.id}".`,
			);
		}
		const developmentParams = nestedDevelopmentEffect.params as {
			id?: unknown;
			developmentId?: unknown;
		};
		const effectDevelopmentId =
			typeof developmentParams.id === 'string'
				? developmentParams.id
				: typeof developmentParams.developmentId === 'string'
					? developmentParams.developmentId
					: undefined;
		if (!effectDevelopmentId) {
			throw new Error(
				`Missing development id for action "${nestedAction.id}".`,
			);
		}
		const developmentId = effectDevelopmentId;

		// Effect groups are in tier 2; upgrade before performing
		engineContext.activePlayer.actionStates[actionId] = {
			locked: false,
			poolLocked: false,
			currentTier: 2,
			exhausted: false,
		};

		const nextLandId = `${engineContext.activePlayer.id}-L${engineContext.activePlayer.lands.length + 1}`;
		const params = {
			landId: nextLandId,
			choices: {
				[group.id]: { optionId },
			},
		} as const;

		const costs = getActionCosts(actionId, engineContext, params);
		engineContext.activePlayer.resourceValues[CResource.cp] =
			costs[CResource.cp] ?? 0;
		engineContext.activePlayer.resourceValues[CResource.gold] =
			costs[CResource.gold] ?? 0;

		const beforeLands = engineContext.activePlayer.lands.length;
		// keys ARE the Resource IDs directly
		const beforeHappiness =
			engineContext.activePlayer.resourceValues[CResource.happiness] ?? 0;
		const beforeGold =
			engineContext.activePlayer.resourceValues[CResource.gold] ?? 0;
		const tilledBefore = engineContext.activePlayer.lands.filter(
			(land) => land.tilled,
		).length;

		const traces = performAction(actionId, engineContext, params);

		expect(engineContext.activePlayer.lands.length).toBe(beforeLands + 1);
		const newLand = engineContext.activePlayer.lands.find(
			(land) => land.id === nextLandId,
		);
		expect(newLand).toBeDefined();
		expect(newLand?.developments).toContain(developmentId);
		expect(newLand?.slotsUsed).toBe(1);

		const tilledAfter = engineContext.activePlayer.lands.filter(
			(land) => land.tilled,
		).length;
		expect(tilledAfter).toBe(tilledBefore + 1);

		const currentTierEffects =
			engineContext.actions.get(actionId).tiers['2']?.effects ?? [];
		const traceIds = traces.map((trace) => trace.id);
		const expectedNested = currentTierEffects.flatMap((effect) => {
			if (!isEffectGroup(effect)) {
				if (effect.type === 'action' && effect.method === 'perform') {
					const nestedId = (effect.params as { id?: string } | undefined)?.id;
					return nestedId ? [nestedId] : [];
				}
				return [];
			}
			const option = effect.options.find(
				(candidate) => candidate.id === optionId,
			);
			return option ? [option.actionId] : [];
		});
		expect(traceIds).toEqual(expect.arrayContaining(expectedNested));

		let happinessGain = 0;
		for (const nestedId of expectedNested) {
			const nested = engineContext.actions.get(nestedId);
			const nestedEffects = getAllEffectsFromAction(nested);
			const effect = nestedEffects.find(
				(candidate) =>
					candidate.type === 'resource' &&
					candidate.method === 'add' &&
					(candidate.params as { key?: string }).resourceId ===
						CResource.happiness,
			);
			if (effect) {
				happinessGain +=
					(effect.params as ResourceAmountParamsResult | undefined)?.amount ??
					0;
			}
		}
		const happinessPenalty = currentTierEffects
			.filter(
				(effect) => effect.type === 'resource' && effect.method === 'remove',
			)
			.reduce((total, effect) => {
				const params = effect.params as ResourceAmountParamsResult | undefined;
				return params?.resourceId === CResource.happiness
					? total + (params.amount ?? 0)
					: total;
			}, 0);
		const afterHappiness =
			engineContext.activePlayer.resourceValues[CResource.happiness] ?? 0;
		expect(afterHappiness).toBe(
			beforeHappiness + happinessGain - happinessPenalty,
		);

		const afterGold =
			engineContext.activePlayer.resourceValues[CResource.gold] ?? 0;
		expect(afterGold).toBe(beforeGold - (costs[CResource.gold] ?? 0));

		const resolved = resolveActionEffects(
			engineContext.actions.get(actionId),
			params,
			2,
		);
		const performEffects = resolved.effects.filter(
			(effect): effect is EffectDef =>
				effect.type === 'action' && effect.method === 'perform',
		);
		const nestedActionId = chosenOption.actionId;
		expect(
			performEffects.some(
				(effect) =>
					(effect.params as Record<string, unknown>)?.['__actionId'] ===
					nestedActionId,
			),
		).toBe(true);
		expect(
			performEffects.some(
				(effect) =>
					(effect.params as Record<string, unknown>)?.['actionId'] ===
					nestedActionId,
			),
		).toBe(true);
		expect(resolved.steps.some((step) => step.type === 'group')).toBe(true);
		const stepTypes = resolved.steps.map((step) => step.type);
		expect(stepTypes).toEqual(['effects', 'effects', 'group', 'effects']);
		const resolvedGroup = resolved.groups.find(
			(candidate) => candidate.group.id === group.id,
		);
		expect(resolvedGroup?.selection?.params).toMatchObject({
			landId: params.landId,
		});
	});
});
