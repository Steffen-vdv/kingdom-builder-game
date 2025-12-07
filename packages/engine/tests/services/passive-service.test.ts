import { describe, it, expect } from 'vitest';
import { Resource as CResource } from '@kingdom-builder/contents';
import { createTestEngine } from '../helpers';
import { getActionCosts } from '../../src';
import { createContentFactory } from '@kingdom-builder/testing';
import { resourceAmountParams } from '../helpers/resourceV2Params.ts';

describe('PassiveManager', () => {
	it('applies and unregisters cost modifiers', () => {
		const content = createContentFactory();
		const action = content.action({ baseCosts: { [CResource.gold]: 1 } });
		const engineContext = createTestEngine({ actions: content.actions });
		const baseCost = getActionCosts(action.id, engineContext);
		const base = { [CResource.gold]: baseCost[CResource.gold] || 0 };
		engineContext.passives.registerCostModifier('mod', () => ({
			flat: { [CResource.gold]: 1 },
		}));
		const modified = engineContext.passives.applyCostMods(
			action.id,
			base,
			engineContext,
		);
		expect(modified[CResource.gold]).toBe((base[CResource.gold] || 0) + 1);
		engineContext.passives.unregisterCostModifier('mod');
		const reverted = engineContext.passives.applyCostMods(
			action.id,
			base,
			engineContext,
		);
		expect(reverted[CResource.gold]).toBe(base[CResource.gold]);
	});

	it('combines flat and percent cost modifiers additively', () => {
		const content = createContentFactory();
		const action = content.action({ baseCosts: { [CResource.gold]: 4 } });
		const engineContext = createTestEngine({ actions: content.actions });
		const baseCost = getActionCosts(action.id, engineContext);
		const base = { [CResource.gold]: baseCost[CResource.gold] || 0 };
		engineContext.passives.registerCostModifier('flat', () => ({
			flat: { [CResource.gold]: 5 },
		}));
		engineContext.passives.registerCostModifier('pctA', () => ({
			percent: { [CResource.gold]: 0.2 },
		}));
		engineContext.passives.registerCostModifier('pctB', () => ({
			percent: { [CResource.gold]: -0.1 },
		}));
		const modified = engineContext.passives.applyCostMods(
			action.id,
			base,
			engineContext,
		);
		const baseWithFlat = (base[CResource.gold] || 0) + 5;
		expect(modified[CResource.gold]).toBeCloseTo(
			baseWithFlat * (1 + 0.2 - 0.1),
		);
	});

	it('rounds percent cost modifiers up when requested', () => {
		const content = createContentFactory();
		const action = content.action({ baseCosts: { [CResource.gold]: 7 } });
		const engineContext = createTestEngine({ actions: content.actions });
		const baseCost = getActionCosts(action.id, engineContext);
		const base = { [CResource.gold]: baseCost[CResource.gold] || 0 };
		engineContext.passives.registerCostModifier('roundedDiscount', () => ({
			percent: { [CResource.gold]: -0.2 },
			round: 'up',
		}));
		const modified = engineContext.passives.applyCostMods(
			action.id,
			base,
			engineContext,
		);
		const baseValue = base[CResource.gold] || 0;
		expect(modified[CResource.gold]).toBe(baseValue - 2);
	});

	it('runs result modifiers and handles passives', () => {
		const content = createContentFactory();
		const action = content.action();
		const engineContext = createTestEngine({ actions: content.actions });
		engineContext.passives.registerResultModifier(
			'happy',
			(_unusedActionResult, innerEngineContext) => {
				innerEngineContext.activePlayer.resourceValues[CResource.happiness] =
					(innerEngineContext.activePlayer.resourceValues[
						CResource.happiness
					] ?? 0) + 1;
			},
		);
		engineContext.passives.runResultMods(action.id, engineContext);
		expect(engineContext.activePlayer.resourceValues[CResource.happiness]).toBe(
			1,
		);
		engineContext.passives.unregisterResultModifier('happy');

		const passive = {
			id: 'shiny',
			effects: [
				{
					type: 'resource',
					method: 'add',
					params: resourceAmountParams({
						key: CResource.gold,
						amount: 2,
					}),
				},
			],
		};
		// CResource.gold IS the ResourceV2 ID
		const before =
			engineContext.activePlayer.resourceValues[CResource.gold] ?? 0;
		engineContext.passives.addPassive(passive, engineContext);
		expect(
			engineContext.passives
				.list(engineContext.activePlayer.id)
				.some((entry) => entry.id === 'shiny'),
		).toBe(true);
		expect(engineContext.activePlayer.resourceValues[CResource.gold]).toBe(
			before + 2,
		);
		engineContext.passives.removePassive('shiny', engineContext);
		expect(
			engineContext.passives
				.list(engineContext.activePlayer.id)
				.some((entry) => entry.id === 'shiny'),
		).toBe(false);
		expect(engineContext.activePlayer.resourceValues[CResource.gold]).toBe(
			before,
		);
		engineContext.passives.removePassive('unknown', engineContext);
	});

	it('applies percent evaluation modifiers after flat adjustments', () => {
		const resourceKey = Object.values(CResource)[0];
		const engineContext = createTestEngine();
		const gains = [{ key: resourceKey, amount: 10 }];
		engineContext.passives.registerEvaluationModifier(
			'flatPctA',
			'test:target',
			(_unusedModifierContext, localGains) => {
				localGains[0]!.amount += 5;
				return { percent: 0.2 };
			},
		);
		engineContext.passives.registerEvaluationModifier(
			'flatPctB',
			'test:target',
			(_unusedModifierContext, localGains) => {
				localGains[0]!.amount -= 3;
				return { percent: -0.1 };
			},
		);
		engineContext.passives.runEvaluationMods(
			'test:target',
			engineContext,
			gains,
		);
		expect(gains[0]!.amount).toBeCloseTo((10 + 5 - 3) * (1 + 0.2 - 0.1));
	});

	it('scales negative evaluation gains multiplicatively', () => {
		const resourceKey = Object.values(CResource)[0];
		const engineContext = createTestEngine();
		const gains = [{ key: resourceKey, amount: 6 }];
		engineContext.passives.registerEvaluationModifier(
			'negFlat',
			'test:target',
			(_unusedModifierContext, localGains) => {
				localGains[0]!.amount -= 12;
				return { percent: 0.5 };
			},
		);
		engineContext.passives.registerEvaluationModifier(
			'negPct',
			'test:target',
			() => ({
				percent: 0.25,
			}),
		);
		engineContext.passives.runEvaluationMods(
			'test:target',
			engineContext,
			gains,
		);
		expect(gains[0]!.amount).toBeCloseTo(-6 * (1 + 0.5 + 0.25));
	});

	it('rounds evaluation percent modifiers up when requested', () => {
		const resourceKey = Object.values(CResource)[0];
		const engineContext = createTestEngine();
		const gains = [{ key: resourceKey, amount: 1 }];
		engineContext.passives.registerEvaluationModifier(
			'roundedUp',
			'test:target',
			() => ({
				percent: 0.25,
				round: 'up',
			}),
		);
		engineContext.passives.runEvaluationMods(
			'test:target',
			engineContext,
			gains,
		);
		expect(gains[0]!.amount).toBe(2);
	});

	it('rounds evaluation penalties up against the player', () => {
		const resourceKey = Object.values(CResource)[0];
		const engineContext = createTestEngine();
		const gains = [{ key: resourceKey, amount: 4 }];
		engineContext.passives.registerEvaluationModifier(
			'roundedPenalty',
			'test:target',
			() => ({ percent: -0.25, round: 'up' }),
		);
		engineContext.passives.runEvaluationMods(
			'test:target',
			engineContext,
			gains,
		);
		expect(gains[0]!.amount).toBe(3);
	});
});
