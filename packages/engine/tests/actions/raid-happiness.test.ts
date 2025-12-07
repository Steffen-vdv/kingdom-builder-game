import { describe, it, expect } from 'vitest';
import { advance } from '../../src/index.ts';
import { runEffects } from '../../src/effects/index.ts';
import { Resource as CResource } from '@kingdom-builder/contents';
import { createContentFactory } from '@kingdom-builder/testing';
import { createTestEngine } from '../helpers.ts';
import { resourceAmountParams } from '../helpers/resourceParams.ts';

describe('resource removal penalties', () => {
	it('can target the opponent when shortfalls are allowed', () => {
		const content = createContentFactory();
		const engineContext = createTestEngine(content);
		advance(engineContext);
		const original = engineContext.game.currentPlayerIndex;
		engineContext.game.currentPlayerIndex = 1;
		// CResource.happiness IS the Resource ID directly
		engineContext.activePlayer.resourceValues[CResource.happiness] = 0;
		const before =
			engineContext.activePlayer.resourceValues[CResource.happiness] ?? 0;
		const penalty = resourceAmountParams({
			resourceId: CResource.happiness,
			amount: 1,
		});
		runEffects(
			[
				{
					type: 'resource',
					method: 'remove',
					params: penalty,
					meta: { allowShortfall: true },
				},
			],
			engineContext,
		);
		const after =
			engineContext.activePlayer.resourceValues[CResource.happiness] ?? 0;
		expect(after).toBe(before - penalty.amount);
		expect(after).toBeLessThan(0);
		engineContext.game.currentPlayerIndex = original;
	});
});
