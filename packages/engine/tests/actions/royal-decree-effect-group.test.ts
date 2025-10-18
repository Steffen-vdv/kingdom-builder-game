import { describe, it, expect } from 'vitest';
import {
	advance,
	getActionCosts,
	performAction,
	resolveActionEffects,
} from '../../src';
import type { EffectDef } from '@kingdom-builder/protocol';
import { createTestEngine } from '../helpers';
import { Resource as CResource, PhaseId } from '@kingdom-builder/contents';

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
			.find(([, definition]) => definition.effects.some(isEffectGroup))!;
		const group = royalDecree.effects.find(isEffectGroup)!;
		const chosenOption = group.options[0];
		const optionId = chosenOption.id;
		const developmentId = String(
			chosenOption.params?.['developmentId'] ?? chosenOption.params?.['id'],
		);
		expect(developmentId).toBeTruthy();

		const nextLandId = `${engineContext.activePlayer.id}-L${engineContext.activePlayer.lands.length + 1}`;
		const params = {
			landId: nextLandId,
			choices: {
				[group.id]: { optionId },
			},
		} as const;

		const costs = getActionCosts(actionId, engineContext, params);
		engineContext.activePlayer.ap = costs[CResource.ap] ?? 0;
		engineContext.activePlayer.gold = costs[CResource.gold] ?? 0;

		const beforeLands = engineContext.activePlayer.lands.length;
		const beforeHappiness =
			engineContext.activePlayer.resources[CResource.happiness] ?? 0;
		const beforeGold = engineContext.activePlayer.gold;
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

		const traceIds = traces.map((trace) => trace.id);
		const expectedNested = royalDecree.effects.flatMap((effect) => {
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
			const effect = nested.effects.find(
				(candidate) =>
					candidate.type === 'resource' &&
					candidate.method === 'add' &&
					(candidate.params as { key?: string }).key === CResource.happiness,
			);
			if (effect) {
				happinessGain += (effect.params as { amount?: number })?.amount ?? 0;
			}
		}
		const happinessPenalty = engineContext.actions
			.get(actionId)
			.effects.filter(
				(effect) => effect.type === 'resource' && effect.method === 'remove',
			)
			.reduce((total, effect) => {
				const params = effect.params as
					| { key?: string; amount?: number }
					| undefined;
				return params?.key === CResource.happiness
					? total + (params.amount ?? 0)
					: total;
			}, 0);
		expect(engineContext.activePlayer.resources[CResource.happiness]).toBe(
			beforeHappiness + happinessGain - happinessPenalty,
		);

		expect(engineContext.activePlayer.gold).toBe(
			beforeGold - (costs[CResource.gold] ?? 0),
		);

		const resolved = resolveActionEffects(
			engineContext.actions.get(actionId),
			params,
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
			developmentId,
			landId: params.landId,
		});
	});
});
