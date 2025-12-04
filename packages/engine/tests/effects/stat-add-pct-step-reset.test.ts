import { describe, it, expect } from 'vitest';
import { Stat } from '@kingdom-builder/contents';
import { runEffects } from '../../src/effects/index.ts';
import { createTestEngine } from '../helpers.ts';

describe('stat:add_pct effect', () => {
	it('resets cached base between steps', () => {
		const engineContext = createTestEngine();
		// Stat values ARE ResourceV2 IDs - access via resourceValues
		engineContext.activePlayer.resourceValues[Stat.absorption] = 0.2;
		engineContext.game.currentStep = 's1';
		const effect = {
			type: 'stat',
			method: 'add_pct',
			params: { key: Stat.absorption, percent: 0.5 },
		} as const;
		runEffects([effect], engineContext);
		expect(
			engineContext.activePlayer.resourceValues[Stat.absorption],
		).toBeCloseTo(0.3);
		engineContext.game.currentStep = 's2';
		runEffects([effect], engineContext);
		expect(
			engineContext.activePlayer.resourceValues[Stat.absorption],
		).toBeCloseTo(0.45);
	});
});
