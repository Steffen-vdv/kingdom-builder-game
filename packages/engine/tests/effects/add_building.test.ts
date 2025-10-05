import { describe, it, expect } from 'vitest';
import { performAction, getActionCosts, advance } from '../../src';
import { Resource as CResource, PhaseId } from '@kingdom-builder/contents';
import { createTestEngine } from '../helpers';
import { createContentFactory } from '../factories/content';

describe('building:add effect', () => {
	it('adds building and applies its passives', () => {
		const content = createContentFactory();
		const target = content.action({ baseCosts: { [CResource.gold]: 4 } });
		const building = content.building({
			costs: { [CResource.gold]: 3 },
			onBuild: [
				{
					type: 'cost_mod',
					method: 'add',
					params: {
						id: 'mod',
						actionId: target.id,
						key: CResource.gold,
						amount: 2,
					},
				},
			],
		});
		const grant = content.action({
			effects: [
				{ type: 'building', method: 'add', params: { id: building.id } },
			],
		});
		const ctx = createTestEngine(content);
		while (ctx.game.currentPhase !== PhaseId.Main) {
			advance(ctx);
		}
		const before = getActionCosts(target.id, ctx)[CResource.gold] ?? 0;
		const cost = getActionCosts(grant.id, ctx, { id: building.id });
		ctx.activePlayer.gold = cost[CResource.gold] ?? 0;
		ctx.activePlayer.ap = cost[CResource.ap] ?? 0;
		performAction(grant.id, ctx, { id: building.id });
		const after = getActionCosts(target.id, ctx)[CResource.gold] ?? 0;
		const bonus = building.onBuild?.find(
			(e) => e.type === 'cost_mod' && e.method === 'add',
		)?.params?.['amount'] as number;
		expect(ctx.activePlayer.buildings.has(building.id)).toBe(true);
		expect(after).toBe(before + bonus);
	});

	it('throws before paying costs when building already owned', () => {
		const content = createContentFactory();
		const building = content.building({ costs: { [CResource.gold]: 2 } });
		const grant = content.action({
			effects: [
				{ type: 'building', method: 'add', params: { id: building.id } },
			],
		});
		const ctx = createTestEngine(content);
		while (ctx.game.currentPhase !== PhaseId.Main) {
			advance(ctx);
		}
		const cost = getActionCosts(grant.id, ctx, { id: building.id });
		for (const [key, value] of Object.entries(cost)) {
			ctx.activePlayer.resources[key] = (value ?? 0) * 2;
		}

		performAction(grant.id, ctx, { id: building.id });

		const actionKey = ctx.actionCostResource as string;
		ctx.activePlayer.resources[actionKey] = 5;
		ctx.activePlayer.resources[CResource.gold] = 10;
		expect(() => performAction(grant.id, ctx, { id: building.id })).toThrow(
			`Building ${building.id} already built`,
		);
		expect(ctx.activePlayer.resources[actionKey]).toBe(5);
		expect(ctx.activePlayer.resources[CResource.gold]).toBe(10);
	});

	it('allows rebuilding after the structure is removed', () => {
		const content = createContentFactory();
		const building = content.building();
		const build = content.action({
			effects: [
				{ type: 'building', method: 'add', params: { id: building.id } },
			],
		});
		const demolish = content.action({
			effects: [
				{ type: 'building', method: 'remove', params: { id: building.id } },
			],
		});
		const ctx = createTestEngine(content);
		while (ctx.game.currentPhase !== PhaseId.Main) {
			advance(ctx);
		}
		const cost = getActionCosts(build.id, ctx, { id: building.id });
		const actionKey = ctx.actionCostResource as string;
		for (const [key, value] of Object.entries(cost)) {
			ctx.activePlayer.resources[key] = (value ?? 0) * 3;
		}

		performAction(build.id, ctx, { id: building.id });
		performAction(demolish.id, ctx, { id: building.id });

		ctx.activePlayer.resources[actionKey] = 5;
		performAction(build.id, ctx, { id: building.id });

		expect(ctx.activePlayer.buildings.has(building.id)).toBe(true);
	});

	it('removes building passives when demolished', () => {
		const content = createContentFactory();
		const surcharge = 2;
		const target = content.action({
			baseCosts: { [CResource.gold]: 3 },
		});
		const building = content.building({
			onBuild: [
				{
					type: 'cost_mod',
					method: 'add',
					params: {
						id: 'building_surcharge',
						actionId: target.id,
						key: CResource.gold,
						amount: surcharge,
					},
				},
			],
		});
		const build = content.action({
			effects: [
				{ type: 'building', method: 'add', params: { id: building.id } },
			],
		});
		const demolish = content.action({
			effects: [
				{ type: 'building', method: 'remove', params: { id: building.id } },
			],
		});
		const ctx = createTestEngine(content);
		while (ctx.game.currentPhase !== PhaseId.Main) {
			advance(ctx);
		}

		for (const key of Object.keys(ctx.activePlayer.resources)) {
			ctx.activePlayer.resources[key] = 10;
		}

		const baseCost = getActionCosts(target.id, ctx)[CResource.gold] ?? 0;

		performAction(build.id, ctx, { id: building.id });
		const afterBuild = getActionCosts(target.id, ctx)[CResource.gold] ?? 0;
		expect(afterBuild - baseCost).toBe(surcharge);

		performAction(demolish.id, ctx, { id: building.id });
		const afterRemoval = getActionCosts(target.id, ctx)[CResource.gold] ?? 0;
		expect(afterRemoval).toBe(baseCost);
	});
});
