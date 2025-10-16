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

function toMain(engineContext: ReturnType<typeof createTestEngine>) {
	while (engineContext.game.currentPhase !== 'main') {
		advance(engineContext);
	}
}

describe('royal decree auto land targeting', () => {
	it('develops the newly expanded land when no landId provided', () => {
		const engineContext = createTestEngine();
		toMain(engineContext);

		const beforeLandCount = engineContext.activePlayer.lands.length;
		engineContext.activePlayer.gold = 12;
		engineContext.activePlayer.ap = 1;

		const [actionId, royalDecree] = engineContext.actions
			.entries()
			.find(([, def]) => def.effects.some(isEffectGroup))!;
		const group = royalDecree.effects.find(isEffectGroup)!;
		const option = group.options[0]!;

		performAction(actionId, engineContext, {
			choices: {
				[group.id]: { optionId: option.id },
			},
		});

		expect(engineContext.activePlayer.lands).toHaveLength(beforeLandCount + 1);
		const newestLand = engineContext.activePlayer.lands.at(-1);
		expect(newestLand?.tilled).toBe(true);
		expect(newestLand?.developments).toContain(
			option.params?.['developmentId'] as string,
		);
	});
});
