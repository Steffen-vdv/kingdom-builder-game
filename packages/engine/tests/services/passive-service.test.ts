import { describe, it, expect } from 'vitest';
import { Resource as CResource } from '@kingdom-builder/contents';
import { createTestEngine } from '../helpers';
import { getActionCosts } from '../../src';
import { createContentFactory } from '../factories/content';

describe('PassiveManager', () => {
	it('applies and unregisters cost modifiers', () => {
		const content = createContentFactory();
		const action = content.action({ baseCosts: { [CResource.gold]: 1 } });
		const ctx = createTestEngine({ actions: content.actions });
		const baseCost = getActionCosts(action.id, ctx);
		const base = { [CResource.gold]: baseCost[CResource.gold] || 0 };
		ctx.passives.registerCostModifier('mod', () => ({
			flat: { [CResource.gold]: 1 },
		}));
		const modified = ctx.passives.applyCostMods(action.id, base, ctx);
		expect(modified[CResource.gold]).toBe((base[CResource.gold] || 0) + 1);
		ctx.passives.unregisterCostModifier('mod');
		const reverted = ctx.passives.applyCostMods(action.id, base, ctx);
		expect(reverted[CResource.gold]).toBe(base[CResource.gold]);
	});

	it('combines flat and percent cost modifiers additively', () => {
		const content = createContentFactory();
		const action = content.action({ baseCosts: { [CResource.gold]: 4 } });
		const ctx = createTestEngine({ actions: content.actions });
		const baseCost = getActionCosts(action.id, ctx);
		const base = { [CResource.gold]: baseCost[CResource.gold] || 0 };
		ctx.passives.registerCostModifier('flat', () => ({
			flat: { [CResource.gold]: 5 },
		}));
		ctx.passives.registerCostModifier('pctA', () => ({
			percent: { [CResource.gold]: 0.2 },
		}));
		ctx.passives.registerCostModifier('pctB', () => ({
			percent: { [CResource.gold]: -0.1 },
		}));
		const modified = ctx.passives.applyCostMods(action.id, base, ctx);
		const baseWithFlat = (base[CResource.gold] || 0) + 5;
		expect(modified[CResource.gold]).toBeCloseTo(
			baseWithFlat * (1 + 0.2 - 0.1),
		);
	});

	it('rounds percent cost modifiers up when requested', () => {
		const content = createContentFactory();
		const action = content.action({ baseCosts: { [CResource.gold]: 7 } });
		const ctx = createTestEngine({ actions: content.actions });
		const baseCost = getActionCosts(action.id, ctx);
		const base = { [CResource.gold]: baseCost[CResource.gold] || 0 };
		ctx.passives.registerCostModifier('roundedDiscount', () => ({
			percent: { [CResource.gold]: -0.2 },
			round: 'up',
		}));
		const modified = ctx.passives.applyCostMods(action.id, base, ctx);
		const baseValue = base[CResource.gold] || 0;
		expect(modified[CResource.gold]).toBe(baseValue - 2);
	});

	it('runs result modifiers and handles passives', () => {
		const content = createContentFactory();
		const action = content.action();
		const ctx = createTestEngine({ actions: content.actions });
		ctx.passives.registerResultModifier('happy', (_result, innerCtx) => {
			innerCtx.activePlayer.happiness += 1;
		});
		ctx.passives.runResultMods(action.id, ctx);
		expect(ctx.activePlayer.happiness).toBe(1);
		ctx.passives.unregisterResultModifier('happy');

		const passive = {
			id: 'shiny',
			effects: [
				{
					type: 'resource',
					method: 'add',
					params: { key: CResource.gold, amount: 2 },
				},
			],
		};
		const before = ctx.activePlayer.gold;
		ctx.passives.addPassive(passive, ctx);
		expect(
			ctx.passives
				.list(ctx.activePlayer.id)
				.some((entry) => entry.id === 'shiny'),
		).toBe(true);
		expect(ctx.activePlayer.gold).toBe(before + 2);
		ctx.passives.removePassive('shiny', ctx);
		expect(
			ctx.passives
				.list(ctx.activePlayer.id)
				.some((entry) => entry.id === 'shiny'),
		).toBe(false);
		expect(ctx.activePlayer.gold).toBe(before);
		ctx.passives.removePassive('unknown', ctx);
	});

	it('applies percent evaluation modifiers after flat adjustments', () => {
		const resourceKey = Object.values(CResource)[0];
		const ctx = createTestEngine();
		const gains = [{ key: resourceKey, amount: 10 }];
		ctx.passives.registerEvaluationModifier(
			'flatPctA',
			'test:target',
			(_ctx, localGains) => {
				localGains[0]!.amount += 5;
				return { percent: 0.2 };
			},
		);
		ctx.passives.registerEvaluationModifier(
			'flatPctB',
			'test:target',
			(_ctx, localGains) => {
				localGains[0]!.amount -= 3;
				return { percent: -0.1 };
			},
		);
		ctx.passives.runEvaluationMods('test:target', ctx, gains);
		expect(gains[0]!.amount).toBeCloseTo((10 + 5 - 3) * (1 + 0.2 - 0.1));
	});

	it('scales negative evaluation gains multiplicatively', () => {
		const resourceKey = Object.values(CResource)[0];
		const ctx = createTestEngine();
		const gains = [{ key: resourceKey, amount: 6 }];
		ctx.passives.registerEvaluationModifier(
			'negFlat',
			'test:target',
			(_ctx, localGains) => {
				localGains[0]!.amount -= 12;
				return { percent: 0.5 };
			},
		);
		ctx.passives.registerEvaluationModifier('negPct', 'test:target', () => ({
			percent: 0.25,
		}));
		ctx.passives.runEvaluationMods('test:target', ctx, gains);
		expect(gains[0]!.amount).toBeCloseTo(-6 * (1 + 0.5 + 0.25));
	});

	it('rounds evaluation percent modifiers up when requested', () => {
		const resourceKey = Object.values(CResource)[0];
		const ctx = createTestEngine();
		const gains = [{ key: resourceKey, amount: 1 }];
		ctx.passives.registerEvaluationModifier('roundedUp', 'test:target', () => ({
			percent: 0.25,
			round: 'up',
		}));
		ctx.passives.runEvaluationMods('test:target', ctx, gains);
		expect(gains[0]!.amount).toBe(2);
	});

	it('rounds evaluation penalties up against the player', () => {
		const resourceKey = Object.values(CResource)[0];
		const ctx = createTestEngine();
		const gains = [{ key: resourceKey, amount: 4 }];
		ctx.passives.registerEvaluationModifier(
			'roundedPenalty',
			'test:target',
			() => ({ percent: -0.25, round: 'up' }),
		);
		ctx.passives.runEvaluationMods('test:target', ctx, gains);
		expect(gains[0]!.amount).toBe(3);
	});
});
