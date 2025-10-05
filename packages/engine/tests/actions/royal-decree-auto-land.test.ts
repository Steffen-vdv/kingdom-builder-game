import { describe, it, expect } from 'vitest';
import { advance, performAction } from '../../src';
import { createTestEngine } from '../helpers';

interface EffectGroup {
	id: string;
	options: { id: string; params?: Record<string, unknown> }[];
}

function isEffectGroup(effect: unknown): effect is EffectGroup {
	return (
		typeof effect === 'object' &&
		effect !== null &&
		Array.isArray((effect as { options?: unknown }).options)
	);
}

function toMain(ctx: ReturnType<typeof createTestEngine>) {
	while (ctx.game.currentPhase !== 'main') {
		advance(ctx);
	}
}

describe('royal decree auto land targeting', () => {
	it('develops the newly expanded land when no landId provided', () => {
		const ctx = createTestEngine();
		toMain(ctx);

		const beforeLandCount = ctx.activePlayer.lands.length;
		ctx.activePlayer.gold = 12;
		ctx.activePlayer.ap = 1;

		const [actionId, royalDecree] = ctx.actions
			.entries()
			.find(([, def]) => def.effects.some(isEffectGroup))!;
		const group = royalDecree.effects.find(isEffectGroup)!;
		const option = group.options[0]!;

		performAction(actionId, ctx, {
			choices: {
				[group.id]: { optionId: option.id },
			},
		});

		expect(ctx.activePlayer.lands).toHaveLength(beforeLandCount + 1);
		const newestLand = ctx.activePlayer.lands.at(-1);
		expect(newestLand?.tilled).toBe(true);
		expect(newestLand?.developments).toContain(
			option.params?.['developmentId'] as string,
		);
	});
});
