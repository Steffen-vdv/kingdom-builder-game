import { describe, it, expect } from 'vitest';
import { Services } from '../../src/services';
import { PlayerState, Land } from '../../src/state';
import { createTestEngine } from '../helpers';
import { RULES, Resource as CResource } from '@kingdom-builder/contents';
import {
	happinessTier,
	tierPassive,
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
						.passive(tierPassive('test:passive:low'))
						.build(),
					happinessTier('test:tier:high')
						.range(6)
						.incomeMultiplier(2)
						.passive(tierPassive('test:passive:high'))
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
		const cap = services.populationCap.getCap(player);
		const houseCap = house.populationCap || 0;
		const baseCap = RULES.basePopulationCap;
		expect(cap).toBe(baseCap + houseCap * 3);
	});
});

describe('PassiveManager', () => {
	it('applies and unregisters cost modifiers', () => {
		const content = createContentFactory();
		const action = content.action({ baseCosts: { [CResource.gold]: 1 } });
		const context = createTestEngine({ actions: content.actions });
		const baseCost = getActionCosts(action.id, context);
		const base = { [CResource.gold]: baseCost[CResource.gold] || 0 };
		context.passives.registerCostModifier('modifier', () => ({
			flat: { [CResource.gold]: 1 },
		}));
		const modified = context.passives.applyCostModifiers(
			action.id,
			base,
			context,
		);
		expect(modified[CResource.gold]).toBe((base[CResource.gold] || 0) + 1);
		context.passives.unregisterCostModifier('modifier');
		const reverted = context.passives.applyCostModifiers(
			action.id,
			base,
			context,
		);
		expect(reverted[CResource.gold]).toBe(base[CResource.gold]);
	});

	it('combines flat and percent cost modifiers additively', () => {
		const content = createContentFactory();
		const action = content.action({ baseCosts: { [CResource.gold]: 4 } });
		const context = createTestEngine({ actions: content.actions });
		const baseCost = getActionCosts(action.id, context);
		const base = { [CResource.gold]: baseCost[CResource.gold] || 0 };
		context.passives.registerCostModifier('flat', () => ({
			flat: { [CResource.gold]: 5 },
		}));
		context.passives.registerCostModifier('percentA', () => ({
			percent: { [CResource.gold]: 0.2 },
		}));
		context.passives.registerCostModifier('percentB', () => ({
			percent: { [CResource.gold]: -0.1 },
		}));
		const modified = context.passives.applyCostModifiers(
			action.id,
			base,
			context,
		);
		const baseWithFlat = (base[CResource.gold] || 0) + 5;
		expect(modified[CResource.gold]).toBeCloseTo(
			baseWithFlat * (1 + 0.2 - 0.1),
		);
	});

	it('runs result modifiers and handles passives', () => {
		const content = createContentFactory();
		const action = content.action();
		const context = createTestEngine({ actions: content.actions });
		context.passives.registerResultModifier('happy', (_a, innerContext) => {
			innerContext.activePlayer.happiness += 1;
		});
		context.passives.runResultModifiers(action.id, context);
		expect(context.activePlayer.happiness).toBe(1);
		context.passives.unregisterResultModifier('happy');

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
		const before = context.activePlayer.gold;
		context.passives.addPassive(passive, context);
		expect(
			context.passives
				.list(context.activePlayer.id)
				.some((entry) => entry.id === 'shiny'),
		).toBe(true);
		expect(context.activePlayer.gold).toBe(before + 2);
		context.passives.removePassive('shiny', context);
		expect(
			context.passives
				.list(context.activePlayer.id)
				.some((entry) => entry.id === 'shiny'),
		).toBe(false);
		expect(context.activePlayer.gold).toBe(before);
		context.passives.removePassive('unknown', context);
	});

	it('applies percent evaluation modifiers after flat adjustments', () => {
		const resourceKey = Object.values(CResource)[0];
		const context = createTestEngine();
		const gains = [{ key: resourceKey, amount: 10 }];
		context.passives.registerEvaluationModifier(
			'flatPercentA',
			'test:target',
			(_context, localGains) => {
				localGains[0]!.amount += 5;
				return { percent: 0.2 };
			},
		);
		context.passives.registerEvaluationModifier(
			'flatPercentB',
			'test:target',
			(_context, localGains) => {
				localGains[0]!.amount -= 3;
				return { percent: -0.1 };
			},
		);
		context.passives.runEvaluationModifiers('test:target', context, gains);
		expect(gains[0]!.amount).toBeCloseTo((10 + 5 - 3) * (1 + 0.2 - 0.1));
	});

	it('scales negative evaluation gains multiplicatively', () => {
		const resourceKey = Object.values(CResource)[0];
		const context = createTestEngine();
		const gains = [{ key: resourceKey, amount: 6 }];
		context.passives.registerEvaluationModifier(
			'negativeFlat',
			'test:target',
			(_context, localGains) => {
				localGains[0]!.amount -= 12;
				return { percent: 0.5 };
			},
		);
		context.passives.registerEvaluationModifier(
			'negativePercent',
			'test:target',
			() => ({
				percent: 0.25,
			}),
		);
		context.passives.runEvaluationModifiers('test:target', context, gains);
		expect(gains[0]!.amount).toBeCloseTo(-6 * (1 + 0.5 + 0.25));
	});
});
