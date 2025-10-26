import { describe, it, expect } from 'vitest';
import { performAction, advance, getActionCosts } from '../../src';
import { Resource as CResource, PhaseId } from '@kingdom-builder/contents';
import { createTestEngine } from '../helpers';
import { createContentFactory } from '@kingdom-builder/testing';
import {
	resourceAmountParams,
	type ResourceAmountParamsResult,
} from '../helpers/resourceV2Params.ts';

function toMain(engineContext: ReturnType<typeof createTestEngine>) {
	while (engineContext.game.currentPhase !== PhaseId.Main) {
		advance(engineContext);
	}
}

describe('actions with synthetic content', () => {
	it('pays costs and applies resource effects', () => {
		const content = createContentFactory();
		const actionDefinition = content.action({
			baseCosts: { [CResource.gold]: 2 },
			effects: [
				{
					type: 'resource',
					method: 'add',
					params: resourceAmountParams({
						key: CResource.gold,
						amount: 5,
					}),
				},
			],
		});
		const engineContext = createTestEngine(content);
		toMain(engineContext);
		const costs = getActionCosts(actionDefinition.id, engineContext);
		engineContext.activePlayer.ap = costs[CResource.ap] ?? 0;
		engineContext.activePlayer.gold = costs[CResource.gold] ?? 0;
		const goldId = engineContext.activePlayer.getResourceV2Id(CResource.gold);
		const beforeGold = engineContext.activePlayer.resourceValues[goldId] ?? 0;
		const gain =
			(
				actionDefinition.effects.find(
					(effect) => effect.type === 'resource' && effect.method === 'add',
				)?.params as ResourceAmountParamsResult | undefined
			)?.amount ?? 0;
		performAction(actionDefinition.id, engineContext);
		const afterGold = engineContext.activePlayer.resourceValues[goldId] ?? 0;
		expect(afterGold).toBe(beforeGold - (costs[CResource.gold] ?? 0) + gain);
	});

	it('builds a building and applies its onBuild effects', () => {
		const content = createContentFactory();
		const building = content.building({
			costs: { [CResource.gold]: 3 },
			onBuild: [
				{
					type: 'resource',
					method: 'add',
					params: resourceAmountParams({
						key: CResource.gold,
						amount: 2,
					}),
				},
			],
		});
		const buildAction = content.action({
			effects: [
				{ type: 'building', method: 'add', params: { id: building.id } },
			],
		});
		const engineContext = createTestEngine(content);
		toMain(engineContext);
		const cost = getActionCosts(buildAction.id, engineContext, {
			id: building.id,
		});
		engineContext.activePlayer.ap = cost[CResource.ap] ?? 0;
		engineContext.activePlayer.gold = cost[CResource.gold] ?? 0;
		const goldId = engineContext.activePlayer.getResourceV2Id(CResource.gold);
		const beforeGold = engineContext.activePlayer.resourceValues[goldId] ?? 0;
		const gain =
			(
				building.onBuild?.find(
					(effect) => effect.type === 'resource' && effect.method === 'add',
				)?.params as ResourceAmountParamsResult | undefined
			)?.amount ?? 0;
		performAction(buildAction.id, engineContext, { id: building.id });
		expect(engineContext.activePlayer.buildings.has(building.id)).toBe(true);
		const afterGold = engineContext.activePlayer.resourceValues[goldId] ?? 0;
		expect(afterGold).toBe(beforeGold - (cost[CResource.gold] ?? 0) + gain);
	});

	it('adds a development and runs its onBuild effects', () => {
		const content = createContentFactory();
		const development = content.development({
			onBuild: [
				{
					type: 'resource',
					method: 'add',
					params: resourceAmountParams({
						key: CResource.gold,
						amount: 1,
					}),
				},
			],
		});
		const developAction = content.action({
			baseCosts: { [CResource.gold]: 1 },
			effects: [
				{
					type: 'development',
					method: 'add',
					params: { id: development.id, landId: '$landId' },
				},
			],
		});
		const engineContext = createTestEngine(content);
		toMain(engineContext);
		const land = engineContext.activePlayer.lands.find(
			(land) => land.slotsUsed < land.slotsMax,
		)!;
		const cost = getActionCosts(developAction.id, engineContext, {
			id: development.id,
			landId: land.id,
		});
		engineContext.activePlayer.ap = cost[CResource.ap] ?? 0;
		engineContext.activePlayer.gold = cost[CResource.gold] ?? 0;
		const goldId = engineContext.activePlayer.getResourceV2Id(CResource.gold);
		const beforeGold = engineContext.activePlayer.resourceValues[goldId] ?? 0;
		const beforeSlots = land.slotsUsed;
		const gain =
			(
				development.onBuild?.find(
					(effect) => effect.type === 'resource' && effect.method === 'add',
				)?.params as ResourceAmountParamsResult | undefined
			)?.amount ?? 0;
		performAction(developAction.id, engineContext, {
			id: development.id,
			landId: land.id,
		});
		expect(land.developments).toContain(development.id);
		expect(land.slotsUsed).toBe(beforeSlots + 1);
		const afterGold = engineContext.activePlayer.resourceValues[goldId] ?? 0;
		expect(afterGold).toBe(beforeGold - (cost[CResource.gold] ?? 0) + gain);
	});
});
