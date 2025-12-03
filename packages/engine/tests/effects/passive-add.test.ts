import { describe, it, expect } from 'vitest';
import { runEffects } from '../../src/index.ts';
import { Resource, Stat } from '../../src/state/index.ts';
import { createTestEngine } from '../helpers.ts';
import type { EffectDef } from '../../src/effects/index.ts';
import {
	resourceAmountParams,
	statAmountParams,
} from '../helpers/resourceV2Params.ts';

describe('passive:add effect', () => {
	it('applies nested effects and registers phase triggers', () => {
		const engineContext = createTestEngine();
		const effect: EffectDef<{ id: string } & Record<string, EffectDef[]>> = {
			type: 'passive',
			method: 'add',
			params: {
				id: 'temp',
				onGrowthPhase: [
					{
						type: 'resource',
						method: 'add',
						params: resourceAmountParams({
							key: Resource.gold,
							amount: 1,
						}),
					},
				],
				onUpkeepPhase: [
					{
						type: 'resource',
						method: 'add',
						params: resourceAmountParams({
							key: Resource.gold,
							amount: 1,
						}),
					},
				],
				onBeforeAttacked: [
					{
						type: 'resource',
						method: 'add',
						params: resourceAmountParams({
							key: Resource.gold,
							amount: 1,
						}),
					},
				],
				onAttackResolved: [
					{
						type: 'resource',
						method: 'add',
						params: resourceAmountParams({
							key: Resource.gold,
							amount: 1,
						}),
					},
				],
			},
			effects: [
				{
					type: 'stat',
					method: 'add',
					params: statAmountParams({
						key: Stat.armyStrength,
						amount: 1,
					}),
				},
			],
		};

		// Stat values ARE ResourceV2 IDs - access via resourceValues
		const before = engineContext.activePlayer.resourceValues[Stat.armyStrength];
		runEffects([effect], engineContext);
		expect(engineContext.activePlayer.resourceValues[Stat.armyStrength]).toBe(
			before + 1,
		);
		engineContext.passives.removePassive('temp', engineContext);
		expect(
			engineContext.activePlayer.resourceValues[Stat.armyStrength],
		).toBe(before);
	});
});
