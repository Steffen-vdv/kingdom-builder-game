import { describe, it, expect } from 'vitest';
import { Resource } from '@kingdom-builder/contents';
import { runEffects } from '../../src/effects/index.ts';
import { createTestEngine } from '../helpers.ts';
import { resourcePercentParams } from '../helpers/resourceParams.ts';

describe('resource:add additive percent effect', () => {
	it('resets cached base between steps', () => {
		const engineContext = createTestEngine();
		// Stat values ARE Resource IDs - access via resourceValues
		engineContext.activePlayer.resourceValues[Resource.absorption] = 0.2;
		engineContext.game.currentStep = 's1';
		const effect = {
			type: 'resource',
			method: 'add',
			params: resourcePercentParams({
				resourceId: Resource.absorption,
				percent: 0.5,
				additive: true,
			}),
		};
		runEffects([effect], engineContext);
		expect(
			engineContext.activePlayer.resourceValues[Resource.absorption],
		).toBeCloseTo(0.3);
		engineContext.game.currentStep = 's2';
		runEffects([effect], engineContext);
		expect(
			engineContext.activePlayer.resourceValues[Resource.absorption],
		).toBeCloseTo(0.45);
	});
});
