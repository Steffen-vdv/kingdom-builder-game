import { describe, it, expect } from 'vitest';
import { runEffects } from '../../src/index.ts';
import { Resource, Stat } from '@kingdom-builder/contents';
import { createTestEngine } from '../helpers.ts';
import type { EffectDef } from '../../src/effects/index.ts';
import { resourceAmountParams } from '../helpers/resourceV2Params.ts';

describe('passive:add effect', () => {
	it('applies nested effects and registers phase triggers', () => {
		const engineContext = createTestEngine({ skipInitialSetup: true });
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
					type: 'resource',
					method: 'add',
					params: resourceAmountParams({
						key: Stat.armyStrength,
						amount: 1,
					}),
				},
			],
		};

		// Stat values ARE ResourceV2 IDs - access via resourceValues
		// With skipInitialSetup, stats start as undefined (treated as 0)
		const before =
			engineContext.activePlayer.resourceValues[Stat.armyStrength] ?? 0;
		runEffects([effect], engineContext);
		expect(engineContext.activePlayer.resourceValues[Stat.armyStrength]).toBe(
			before + 1,
		);
		engineContext.passives.removePassive('temp', engineContext);
		// After removing passive, value returns to 0 (undefined treated as 0)
		expect(
			engineContext.activePlayer.resourceValues[Stat.armyStrength] ?? 0,
		).toBe(before);
	});
});
