import { describe, it, expect } from 'vitest';
import { performAction, advance, getActionCosts } from '../../src';
import { Resource as CResource, PhaseId } from '@kingdom-builder/contents';
import { createTestEngine } from '../helpers';
import { createContentFactory } from '@kingdom-builder/testing';
import { resourceAmountParams } from '../helpers/resourceV2Params.ts';

function toMain(engineContext: ReturnType<typeof createTestEngine>) {
	while (engineContext.game.currentPhase !== PhaseId.Main) {
		advance(engineContext);
	}
}

describe('actions with synthetic content', () => {
	it('pays costs and applies resource effects', () => {
		const content = createContentFactory();
		const gainParams = resourceAmountParams({
			key: CResource.gold,
			amount: 5,
		});
		const actionDefinition = content.action({
			baseCosts: { [CResource.gold]: 2 },
			effects: [
				{
					type: 'resource',
					method: 'add',
					params: gainParams,
				},
			],
		});
		const engineContext = createTestEngine(content);
		toMain(engineContext);
		const costs = getActionCosts(actionDefinition.id, engineContext);
		engineContext.activePlayer.ap = costs[CResource.ap] ?? 0;
		engineContext.activePlayer.gold = costs[CResource.gold] ?? 0;
		const beforeGold = engineContext.activePlayer.gold;
		const gain = gainParams.amount;
		performAction(actionDefinition.id, engineContext);
		const expected = beforeGold - (costs[CResource.gold] ?? 0) + gain;
		expect(engineContext.activePlayer.gold).toBe(expected);
		const resourceId = engineContext.activePlayer.getResourceV2Id(
			CResource.gold,
		);
		expect(engineContext.activePlayer.resourceValues[resourceId]).toBe(
			expected,
		);
	});

	it('builds a building and applies its onBuild effects', () => {
		const content = createContentFactory();
		const onBuildGain = resourceAmountParams({
			key: CResource.gold,
			amount: 2,
		});
		const building = content.building({
			costs: { [CResource.gold]: 3 },
			onBuild: [
				{
					type: 'resource',
					method: 'add',
					params: onBuildGain,
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
		const beforeGold = engineContext.activePlayer.gold;
		const gain = onBuildGain.amount;
		performAction(buildAction.id, engineContext, { id: building.id });
		expect(engineContext.activePlayer.buildings.has(building.id)).toBe(true);
		const expected = beforeGold - (cost[CResource.gold] ?? 0) + gain;
		expect(engineContext.activePlayer.gold).toBe(expected);
		const resourceId = engineContext.activePlayer.getResourceV2Id(
			CResource.gold,
		);
		expect(engineContext.activePlayer.resourceValues[resourceId]).toBe(
			expected,
		);
	});

	it('adds a development and runs its onBuild effects', () => {
		const content = createContentFactory();
		const developmentGain = resourceAmountParams({
			key: CResource.gold,
			amount: 1,
		});
		const development = content.development({
			onBuild: [
				{
					type: 'resource',
					method: 'add',
					params: developmentGain,
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
		const beforeGold = engineContext.activePlayer.gold;
		const beforeSlots = land.slotsUsed;
		const gain = developmentGain.amount;
		performAction(developAction.id, engineContext, {
			id: development.id,
			landId: land.id,
		});
		expect(land.developments).toContain(development.id);
		expect(land.slotsUsed).toBe(beforeSlots + 1);
		const expected = beforeGold - (cost[CResource.gold] ?? 0) + gain;
		expect(engineContext.activePlayer.gold).toBe(expected);
		const resourceId = engineContext.activePlayer.getResourceV2Id(
			CResource.gold,
		);
		expect(engineContext.activePlayer.resourceValues[resourceId]).toBe(
			expected,
		);
	});
});
