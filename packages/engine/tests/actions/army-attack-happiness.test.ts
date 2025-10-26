import { describe, it, expect } from 'vitest';
import { advance } from '../../src/index.ts';
import { runEffects } from '../../src/effects/index.ts';
import { Resource } from '@kingdom-builder/contents';
import { createContentFactory } from '@kingdom-builder/testing';
import { createTestEngine } from '../helpers.ts';
import { resourceAmountParams } from '../helpers/resourceV2Params.ts';

describe('resource removal penalties', () => {
	it('can target the opponent when shortfalls are allowed', () => {
		const content = createContentFactory();
		const engineContext = createTestEngine(content);
		advance(engineContext);
		const original = engineContext.game.currentPlayerIndex;
		engineContext.game.currentPlayerIndex = 1;
		engineContext.activePlayer.resources[Resource.happiness] = 0;
		const resourceId = engineContext.activePlayer.getResourceV2Id(
			Resource.happiness,
		);
		const before = engineContext.activePlayer.resourceValues[resourceId] ?? 0;
		runEffects(
			[
				{
					type: 'resource',
					method: 'remove',
					params: resourceAmountParams({
						key: Resource.happiness,
						amount: 1,
					}),
					meta: { allowShortfall: true },
				},
			],
			engineContext,
		);
		const after = engineContext.activePlayer.resourceValues[resourceId] ?? 0;
		expect(after).toBe(before - 1);
		expect(after).toBeLessThan(0);
		engineContext.game.currentPlayerIndex = original;
	});
});
