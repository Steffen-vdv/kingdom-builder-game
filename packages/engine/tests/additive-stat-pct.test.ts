import { describe, it, expect } from 'vitest';
import { runEffects, type EffectDef } from '../src/index.ts';
import { Stat } from '../src/state/index.ts';
import { createTestEngine } from './helpers.ts';
import { resourcePercentParams } from './helpers/resourceV2Params.ts';

describe('stat:add_pct additive scaling', () => {
	it('adds multiple percentages from the original base in the same step', () => {
		const engineContext = createTestEngine();
		const base = 10;
		engineContext.activePlayer.stats[Stat.armyStrength] = base;

		const pct1 = 0.2;
		const pct2 = 0.4;
		const effects: EffectDef[] = [
			{
				type: 'stat',
				method: 'add_pct',
				params: resourcePercentParams(Stat.armyStrength, pct1),
			},
			{
				type: 'stat',
				method: 'add_pct',
				params: resourcePercentParams(Stat.armyStrength, pct2),
			},
		];

		runEffects(effects, engineContext);

		const expected = base * (1 + pct1 + pct2);
		expect(engineContext.activePlayer.stats[Stat.armyStrength]).toBeCloseTo(
			expected,
		);
		const sequential = base * (1 + pct1) * (1 + pct2);
		expect(engineContext.activePlayer.stats[Stat.armyStrength]).not.toBeCloseTo(
			sequential,
		);
	});
});
