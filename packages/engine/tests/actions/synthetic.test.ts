import { describe, it, expect } from 'vitest';
import { performAction, advance, getActionCosts } from '../../src';
import { Resource as CResource, PhaseId } from '@kingdom-builder/contents';
import { createTestEngine } from '../helpers';
import { createContentFactory } from '@kingdom-builder/testing';

function toMain(ctx: ReturnType<typeof createTestEngine>) {
	while (ctx.game.currentPhase !== PhaseId.Main) {
		advance(ctx);
	}
}

describe('actions with synthetic content', () => {
	it('pays costs and applies resource effects', () => {
		const content = createContentFactory();
		const actionDef = content.action({
			baseCosts: { [CResource.ap]: 1, [CResource.gold]: 2 },
			effects: [
				{
					type: 'resource',
					method: 'add',
					params: { key: CResource.gold, amount: 5 },
				},
			],
		});
		const ctx = createTestEngine(content);
		toMain(ctx);
		const costs = getActionCosts(actionDef.id, ctx);
		ctx.activePlayer.ap = costs[CResource.ap] ?? 0;
		ctx.activePlayer.gold = costs[CResource.gold] ?? 0;
		const before = ctx.activePlayer.gold;
		const gain = actionDef.effects.find(
			(effect) => effect.type === 'resource' && effect.method === 'add',
		)?.params?.['amount'] as number;
		performAction(actionDef.id, ctx);
		expect(ctx.activePlayer.gold).toBe(
			before - (costs[CResource.gold] ?? 0) + gain,
		);
	});

	it('builds a building and applies its onBuild effects', () => {
		const content = createContentFactory();
		const building = content.building({
			costs: { [CResource.gold]: 3 },
			onBuild: [
				{
					type: 'resource',
					method: 'add',
					params: { key: CResource.gold, amount: 2 },
				},
			],
		});
		const buildAction = content.action({
			baseCosts: { [CResource.ap]: 1 },
			effects: [
				{ type: 'building', method: 'add', params: { id: building.id } },
			],
		});
		const ctx = createTestEngine(content);
		toMain(ctx);
		const cost = getActionCosts(buildAction.id, ctx, { id: building.id });
		ctx.activePlayer.ap = cost[CResource.ap] ?? 0;
		ctx.activePlayer.gold = cost[CResource.gold] ?? 0;
		const before = ctx.activePlayer.gold;
		const gain = building.onBuild?.find(
			(effect) => effect.type === 'resource' && effect.method === 'add',
		)?.params?.['amount'] as number;
		performAction(buildAction.id, ctx, { id: building.id });
		expect(ctx.activePlayer.buildings.has(building.id)).toBe(true);
		expect(ctx.activePlayer.gold).toBe(
			before - (cost[CResource.gold] ?? 0) + gain,
		);
	});

	it('adds a development and runs its onBuild effects', () => {
		const content = createContentFactory();
		const development = content.development({
			onBuild: [
				{
					type: 'resource',
					method: 'add',
					params: { key: CResource.gold, amount: 1 },
				},
			],
		});
		const developAction = content.action({
			baseCosts: { [CResource.ap]: 1, [CResource.gold]: 1 },
			effects: [
				{
					type: 'development',
					method: 'add',
					params: { id: development.id, landId: '$landId' },
				},
			],
		});
		const ctx = createTestEngine(content);
		toMain(ctx);
		const land = ctx.activePlayer.lands.find(
			(land) => land.slotsUsed < land.slotsMax,
		)!;
		const cost = getActionCosts(developAction.id, ctx, {
			id: development.id,
			landId: land.id,
		});
		ctx.activePlayer.ap = cost[CResource.ap] ?? 0;
		ctx.activePlayer.gold = cost[CResource.gold] ?? 0;
		const beforeGold = ctx.activePlayer.gold;
		const beforeSlots = land.slotsUsed;
		const gain = development.onBuild?.find(
			(effect) => effect.type === 'resource' && effect.method === 'add',
		)?.params?.['amount'] as number;
		performAction(developAction.id, ctx, {
			id: development.id,
			landId: land.id,
		});
		expect(land.developments).toContain(development.id);
		expect(land.slotsUsed).toBe(beforeSlots + 1);
		expect(ctx.activePlayer.gold).toBe(
			beforeGold - (cost[CResource.gold] ?? 0) + gain,
		);
	});
});
