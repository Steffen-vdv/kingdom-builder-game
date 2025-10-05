import { describe, it, expect } from 'vitest';
import { performAction, getActionCosts, advance } from '../../src';
import { createTestEngine } from '../helpers';
import { createContentFactory } from '../factories/content';
import { Resource as CResource, PhaseId } from '@kingdom-builder/contents';

describe('cost_mod effects', () => {
	it('adds and removes cost modifiers', () => {
		const content = createContentFactory();
		const target = content.action({ baseCosts: { [CResource.gold]: 2 } });
		const addMod = content.action({
			effects: [
				{
					type: 'cost_mod',
					method: 'add',
					params: {
						id: 'm',
						actionId: target.id,
						key: CResource.gold,
						amount: 1,
					},
				},
			],
		});
		const remMod = content.action({
			system: true,
			effects: [
				{
					type: 'cost_mod',
					method: 'remove',
					params: { id: 'm', key: CResource.gold, amount: 0 },
				},
			],
		});
		const ctx = createTestEngine(content);
		while (ctx.game.currentPhase !== PhaseId.Main) {
			advance(ctx);
		}
		const before = getActionCosts(target.id, ctx)[CResource.gold] ?? 0;
		const cost = getActionCosts(addMod.id, ctx);
		ctx.activePlayer.ap = cost[CResource.ap] ?? 0;
		ctx.activePlayer.gold = cost[CResource.gold] ?? 0;
		performAction(addMod.id, ctx);
		const increased = getActionCosts(target.id, ctx)[CResource.gold] ?? 0;
		ctx.activePlayer.actions.add(remMod.id);
		performAction(remMod.id, ctx);
		const after = getActionCosts(target.id, ctx)[CResource.gold] ?? 0;
		expect(increased).toBe(before + 1);
		expect(after).toBe(before);
	});

	it('supports stacked percentage modifiers after flat adjustments', () => {
		const content = createContentFactory();
		const target = content.action({ baseCosts: { [CResource.gold]: 3 } });
		const addMods = content.action({
			system: true,
			effects: [
				{
					type: 'cost_mod',
					method: 'add',
					params: {
						id: 'flat',
						actionId: target.id,
						key: CResource.gold,
						amount: 4,
					},
				},
				{
					type: 'cost_mod',
					method: 'add',
					params: {
						id: 'pctA',
						actionId: target.id,
						key: CResource.gold,
						percent: 0.2,
					},
				},
				{
					type: 'cost_mod',
					method: 'add',
					params: {
						id: 'pctB',
						actionId: target.id,
						key: CResource.gold,
						percent: -0.1,
					},
				},
			],
		});
		const ctx = createTestEngine(content);
		while (ctx.game.currentPhase !== PhaseId.Main) {
			advance(ctx);
		}
		ctx.activePlayer.actions.add(addMods.id);
		const before = getActionCosts(target.id, ctx)[CResource.gold] ?? 0;
		performAction(addMods.id, ctx);
		const after = getActionCosts(target.id, ctx)[CResource.gold] ?? 0;
		const expectedBase = before + 4;
		expect(after).toBeCloseTo(expectedBase * (1 + 0.2 - 0.1));
	});
});
