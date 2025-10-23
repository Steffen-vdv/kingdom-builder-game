import { describe, it, expect } from 'vitest';
import { advance } from '../../src/index.ts';
import { runEffects } from '../../src/effects/index.ts';
import { Resource } from '@kingdom-builder/contents';
import { createContentFactory } from '@kingdom-builder/testing';
import { createTestEngine } from '../helpers.ts';

describe('resource removal penalties', () => {
	it('throws when a removal would exceed available happiness', () => {
		const content = createContentFactory();
		const engineContext = createTestEngine(content);
		advance(engineContext);
		const original = engineContext.game.currentPlayerIndex;
		engineContext.game.currentPlayerIndex = 1;
		engineContext.activePlayer.resources[Resource.happiness] = 0;
		expect(() => {
			runEffects(
				[
					{
						type: 'resource',
						method: 'remove',
						params: { key: Resource.happiness, amount: 1 },
					},
				],
				engineContext,
			);
		}).toThrow(/Insufficient/);
		const after = engineContext.activePlayer.resources[Resource.happiness] ?? 0;
		expect(after).toBe(0);
		engineContext.game.currentPlayerIndex = original;
	});
});
