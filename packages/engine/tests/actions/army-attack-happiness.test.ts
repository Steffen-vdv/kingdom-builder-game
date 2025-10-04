import { describe, it, expect } from 'vitest';
import { advance } from '../../src/index.ts';
import { runEffects } from '../../src/effects/index.ts';
import { Resource } from '@kingdom-builder/contents';
import { createContentFactory } from '../factories/content.ts';
import { createTestEngine } from '../helpers.ts';

describe('resource removal penalties', () => {
	it('can target the opponent when shortfalls are allowed', () => {
		const content = createContentFactory();
		const ctx = createTestEngine(content);
		advance(ctx);
		const original = ctx.game.currentPlayerIndex;
		ctx.game.currentPlayerIndex = 1;
		ctx.activePlayer.resources[Resource.happiness] = 0;
		const before = ctx.activePlayer.resources[Resource.happiness] ?? 0;
		runEffects(
			[
				{
					type: 'resource',
					method: 'remove',
					params: { key: Resource.happiness, amount: 1 },
					meta: { allowShortfall: true },
				},
			],
			ctx,
		);
		const after = ctx.activePlayer.resources[Resource.happiness] ?? 0;
		expect(after).toBe(before - 1);
		expect(after).toBeLessThan(0);
		ctx.game.currentPlayerIndex = original;
	});
});
