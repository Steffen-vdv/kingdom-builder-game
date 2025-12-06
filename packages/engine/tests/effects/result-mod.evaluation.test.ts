import { describe, it, expect } from 'vitest';
import { runEffects, advance } from '../../src/index.ts';
import { PhaseId, Resource } from '@kingdom-builder/contents';
import { createTestEngine } from '../helpers.ts';
import type { EffectDef } from '../../src/effects/index.ts';
import type { ResourceGain } from '../../src/services/passive_types.ts';
import { resourceAmountParams } from '../helpers/resourceV2Params.ts';

const TARGET_TYPE = 'custom';
const TARGET_ID = 'income';
const TARGET_KEY = `${TARGET_TYPE}:${TARGET_ID}`;

describe('result_mod evaluation modifiers', () => {
	it('applies nested effects, adjustments, amount boosts, and rounding', () => {
		const engineContext = createTestEngine();
		while (engineContext.game.currentPhase !== PhaseId.Main) {
			advance(engineContext);
		}
		engineContext.game.currentPlayerIndex = 0;

		const setupEffect: EffectDef = {
			type: 'result_mod',
			method: 'add',
			params: {
				id: 'eval_boost',
				evaluation: { type: TARGET_TYPE, id: TARGET_ID },
				adjust: 2,
				amount: 1,
				percent: 0.1,
			},
			effects: [
				{
					type: 'resource',
					method: 'add',
					params: resourceAmountParams({
						key: Resource.happiness,
						amount: 3,
					}),
				},
			],
			round: { [Resource.gold]: 'up' },
		};

		runEffects([setupEffect], engineContext);

		// PlayerState uses resourceValues for all resources
		engineContext.activePlayer.resourceValues[Resource.gold] = 0;
		engineContext.activePlayer.resourceValues[Resource.happiness] = 0;
		engineContext.activePlayer.resourceValues[Resource.ap] = 0;

		const gains: ResourceGain[] = [
			{ key: Resource.gold, amount: 5 },
			{ key: Resource.happiness, amount: 3 },
			{ key: Resource.ap, amount: -5 },
		];

		engineContext.passives.runEvaluationMods(TARGET_KEY, engineContext, gains);

		expect(gains[0]).toMatchObject({ key: Resource.gold });
		expect(gains[0].amount).toBe(8);
		expect(gains[1].key).toBe(Resource.happiness);
		expect(gains[1].amount).toBeCloseTo(5.5);
		expect(gains[2].key).toBe(Resource.ap);
		expect(gains[2].amount).toBeCloseTo(-3.3);
		expect(engineContext.activePlayer.resourceValues[Resource.gold]).toBe(1);
		expect(engineContext.activePlayer.resourceValues[Resource.happiness]).toBe(
			4,
		);
		expect(engineContext.activePlayer.resourceValues[Resource.ap]).toBe(0);
	});

	it('unregisters evaluation modifiers and validates inputs', () => {
		const engineContext = createTestEngine();
		while (engineContext.game.currentPhase !== PhaseId.Main) {
			advance(engineContext);
		}

		const addEffect: EffectDef = {
			type: 'result_mod',
			method: 'add',
			params: {
				id: 'missing_check',
				evaluation: { type: TARGET_TYPE, id: TARGET_ID },
			},
		};
		const removeEffect: EffectDef = {
			type: 'result_mod',
			method: 'remove',
			params: {
				id: 'missing_check',
				evaluation: { type: TARGET_TYPE, id: TARGET_ID },
			},
		};

		runEffects([addEffect], engineContext);
		expect(engineContext.passives.evaluationMods.has(TARGET_KEY)).toBe(true);

		runEffects([removeEffect], engineContext);
		expect(engineContext.passives.evaluationMods.has(TARGET_KEY)).toBe(false);

		expect(() =>
			runEffects(
				[
					{
						type: 'result_mod',
						method: 'add',
						params: { id: '', actionId: 'action' },
					},
				],
				engineContext,
			),
		).toThrow('result_mod requires id and actionId or evaluation');

		expect(() =>
			runEffects(
				[
					{
						type: 'result_mod',
						method: 'add',
						params: { id: 'missing_target' },
					},
				],
				engineContext,
			),
		).toThrow('result_mod requires id and actionId or evaluation');
	});
});
