import { describe, it, expect } from 'vitest';
import { runEffects } from '../../src/index.ts';
import { Resource, Stat } from '../../src/state/index.ts';
import { createTestEngine } from '../helpers.ts';
import {
	resourceAmountParams,
	statAmountParams,
} from '../helpers/resourceV2Params.ts';
import type { EffectDef } from '../../src/effects/index.ts';

describe('passive:add effect', () => {
	it('applies nested effects and registers phase triggers', () => {
		const engineContext = createTestEngine();
		const resourceGain = resourceAmountParams(Resource.gold, 1);
		const effect: EffectDef<{ id: string } & Record<string, EffectDef[]>> = {
			type: 'passive',
			method: 'add',
			params: {
				id: 'temp',
				onGrowthPhase: [
					{
						type: 'resource',
						method: 'add',
						params: resourceGain,
					},
				],
				onUpkeepPhase: [
					{
						type: 'resource',
						method: 'add',
						params: resourceGain,
					},
				],
				onBeforeAttacked: [
					{
						type: 'resource',
						method: 'add',
						params: resourceGain,
					},
				],
				onAttackResolved: [
					{
						type: 'resource',
						method: 'add',
						params: resourceGain,
					},
				],
			},
			effects: [
				{
					type: 'stat',
					method: 'add',
					params: statAmountParams(Stat.armyStrength, 1),
				},
			],
		};

		const before = engineContext.activePlayer.stats[Stat.armyStrength];
		runEffects([effect], engineContext);
		expect(engineContext.activePlayer.stats[Stat.armyStrength]).toBe(
			before + 1,
		);
		engineContext.passives.removePassive('temp', engineContext);
		expect(engineContext.activePlayer.stats[Stat.armyStrength]).toBe(before);
	});
});
