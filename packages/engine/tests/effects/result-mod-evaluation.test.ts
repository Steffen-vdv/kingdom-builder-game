import { describe, it, expect } from 'vitest';
import { Resource as CResource } from '@kingdom-builder/contents';
import { runEffects } from '../../src/index.ts';
import { createTestEngine } from '../helpers.ts';
import { resourceAmountParams } from '../helpers/resourceParams.ts';

const EVALUATION_TARGET = 'test:evaluation';
const [EVALUATION_TYPE, EVALUATION_ID] = EVALUATION_TARGET.split(':');

describe('result_mod evaluation modifiers', () => {
	it('applies nested effects, adjustments, and percent modifiers for evaluations', () => {
		const [primaryResource, secondaryResource] = Object.values(CResource);
		const engineContext = createTestEngine();
		const effect = {
			type: 'result_mod' as const,
			method: 'add' as const,
			round: 'up' as const,
			params: {
				id: 'eval-mod',
				evaluation: {
					type: EVALUATION_TYPE ?? 'test',
					id: EVALUATION_ID ?? 'evaluation',
				},
				adjust: 1,
				amount: 2,
				percent: 0.5,
			},
			effects: [
				{
					type: 'resource' as const,
					method: 'add' as const,
					params: resourceAmountParams({
						key: primaryResource,
						amount: 1,
					}),
				},
			],
		};
		// PlayerState uses resourceValues for all resources
		const before =
			engineContext.activePlayer.resourceValues[primaryResource] ?? 0;
		runEffects([effect], engineContext);

		const gains = [
			{ key: primaryResource, amount: 1 },
			{ key: secondaryResource ?? primaryResource, amount: -2 },
		];

		engineContext.passives.runEvaluationMods(
			EVALUATION_TARGET,
			engineContext,
			gains,
		);

		expect(gains[0]).toEqual({ key: primaryResource, amount: 3 });
		expect(gains[1]).toEqual({
			key: secondaryResource ?? primaryResource,
			amount: -2,
		});
		const after =
			engineContext.activePlayer.resourceValues[primaryResource] ?? 0;
		expect(after - before).toBe(3);

		runEffects(
			[
				{
					...effect,
					method: 'remove' as const,
				},
			],
			engineContext,
		);

		const followUpGains = [{ key: primaryResource, amount: 1 }];
		engineContext.passives.runEvaluationMods(
			EVALUATION_TARGET,
			engineContext,
			followUpGains,
		);
		expect(followUpGains[0]).toEqual({ key: primaryResource, amount: 1 });
	});

	it('throws when required identifiers are missing', () => {
		const engineContext = createTestEngine();
		expect(() =>
			runEffects(
				[
					{
						type: 'result_mod' as const,
						method: 'add' as const,
						params: { id: 'missing-context' },
					},
				],
				engineContext,
			),
		).toThrow(/result_mod requires id and actionId or evaluation/);
	});
});
