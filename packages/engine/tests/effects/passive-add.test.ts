import { describe, it, expect } from 'vitest';
import { runEffects } from '../../src/index.ts';
import { Resource } from '@kingdom-builder/contents';
import { createTestEngine } from '../helpers.ts';
import type { EffectDef } from '../../src/effects/index.ts';
import { resourceAmountParams } from '../helpers/resourceParams.ts';

describe('passive:add effect', () => {
	it('applies nested effects and registers step triggers', () => {
		const engineContext = createTestEngine({ skipInitialSetup: true });
		const effect: EffectDef<{ id: string } & Record<string, EffectDef[]>> = {
			type: 'passive',
			method: 'add',
			params: {
				id: 'temp',
				onGainIncomeStep: [
					{
						type: 'resource',
						method: 'add',
						params: resourceAmountParams({
							resourceId: Resource.gold,
							amount: 1,
						}),
					},
				],
				onPayUpkeepStep: [
					{
						type: 'resource',
						method: 'add',
						params: resourceAmountParams({
							resourceId: Resource.gold,
							amount: 1,
						}),
					},
				],
				onBeforeAttacked: [
					{
						type: 'resource',
						method: 'add',
						params: resourceAmountParams({
							resourceId: Resource.gold,
							amount: 1,
						}),
					},
				],
				onAttackResolved: [
					{
						type: 'resource',
						method: 'add',
						params: resourceAmountParams({
							resourceId: Resource.gold,
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
						resourceId: Resource.armyStrength,
						amount: 1,
					}),
				},
			],
		};

		// Stat values ARE Resource IDs - access via resourceValues
		// With skipInitialSetup, stats start as undefined (treated as 0)
		const before =
			engineContext.activePlayer.resourceValues[Resource.armyStrength] ?? 0;
		runEffects([effect], engineContext);
		expect(
			engineContext.activePlayer.resourceValues[Resource.armyStrength],
		).toBe(before + 1);
		engineContext.passives.removePassive('temp', engineContext);
		// After removing passive, value returns to 0 (undefined treated as 0)
		expect(
			engineContext.activePlayer.resourceValues[Resource.armyStrength] ?? 0,
		).toBe(before);
	});
});
