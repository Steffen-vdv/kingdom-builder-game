import { describe, it, expect } from 'vitest';
import { Services } from '../../src/services';
import { PlayerState, Land } from '../../src/state';
import { createTestEngine } from '../helpers';
import { RULES, Resource as CResource } from '@kingdom-builder/contents';
import {
	happinessTier,
	effect,
	passiveParams,
	Types,
	PassiveMethods,
} from '@kingdom-builder/contents/config/builders';
import { getActionCosts } from '../../src';
import { createContentFactory } from '../factories/content';

describe('Services', () => {
	it('evaluates resource tiers correctly', () => {
		const services = new Services(RULES, createContentFactory().developments);
		const getTierEffect = (value: number) =>
			RULES.tierDefinitions
				.filter(
					(t) =>
						value >= t.range.min &&
						(t.range.max === undefined || value <= t.range.max),
				)
				.at(-1)?.effect || {};
		expect(services.tieredResource.tier(0)?.incomeMultiplier).toBe(
			getTierEffect(0).incomeMultiplier,
		);
		expect(services.tieredResource.tier(4)?.incomeMultiplier).toBe(
			getTierEffect(4).incomeMultiplier,
		);
		expect(services.tieredResource.tier(5)?.buildingDiscountPct).toBe(
			getTierEffect(5).buildingDiscountPct,
		);
		expect(services.tieredResource.tier(8)?.incomeMultiplier).toBe(
			getTierEffect(8).incomeMultiplier,
		);
	});

	it('honours inclusive range maximums for tier selection', () => {
		const content = createContentFactory();
		const services = new Services(
			{
				...RULES,
				tierDefinitions: [
					happinessTier('test:tier:low')
						.range(0, 5)
						.incomeMultiplier(1)
						.passive(
							effect()
								.type(Types.Passive)
								.method(PassiveMethods.ADD)
								.params(passiveParams().id('test:passive:low').build()),
						)
						.build(),
					happinessTier('test:tier:high')
						.range(6)
						.incomeMultiplier(2)
						.passive(
							effect()
								.type(Types.Passive)
								.method(PassiveMethods.ADD)
								.params(passiveParams().id('test:passive:high').build()),
						)
						.build(),
				],
			},
			content.developments,
		);
		expect(services.tieredResource.tier(5)?.incomeMultiplier).toBe(1);
		expect(services.tieredResource.tier(6)?.incomeMultiplier).toBe(2);
	});

	it('calculates population cap from houses on land', () => {
		const content = createContentFactory();
		const house = content.development({ populationCap: 1 });
		const services = new Services(RULES, content.developments);
		const player = new PlayerState('A', 'Test');
		const land1 = new Land('l1', 1);
		land1.developments.push(house.id);
		const land2 = new Land('l2', 2);
		land2.developments.push(house.id, house.id);
		player.lands = [land1, land2];
		const cap = services.popcap.getCap(player);
		const houseCap = house.populationCap || 0;
		const baseCap = RULES.basePopulationCap;
		expect(cap).toBe(baseCap + houseCap * 3);
	});
});

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
});
