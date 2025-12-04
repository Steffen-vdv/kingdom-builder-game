import { describe, it, expect } from 'vitest';
import { runEffects, type EffectDef } from '../src/index.ts';
import { Stat } from '@kingdom-builder/contents';
import { createTestEngine } from './helpers.ts';

describe('stat:add_pct additive scaling', () => {
	it('adds multiple percentages from the original base in the same step', () => {
		const engineContext = createTestEngine();
		const base = 10;
		// Stat values ARE ResourceV2 IDs - access via resourceValues
		engineContext.activePlayer.resourceValues[Stat.armyStrength] = base;

		const pct1 = 0.2;
		const pct2 = 0.4;
		const effects: EffectDef[] = [
			{
				type: 'stat',
				method: 'add_pct',
				params: { key: Stat.armyStrength, percent: pct1 },
			},
			{
				type: 'stat',
				method: 'add_pct',
				params: { key: Stat.armyStrength, percent: pct2 },
			},
		];

		runEffects(effects, engineContext);

		const expected = base * (1 + pct1 + pct2);
		expect(
			engineContext.activePlayer.resourceValues[Stat.armyStrength],
		).toBeCloseTo(expected);
		const sequential = base * (1 + pct1) * (1 + pct2);
		expect(
			engineContext.activePlayer.resourceValues[Stat.armyStrength],
		).not.toBeCloseTo(sequential);
	});
});
