import { describe, it, expect } from 'vitest';
import { advance, performAction } from '../../src';
import { createTestEngine } from '../helpers';
import { Resource as CResource } from '@kingdom-builder/contents';

interface EffectGroup {
	id: string;
	options: { id: string; actionId: string; params?: Record<string, unknown> }[];
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
		engineContext.activePlayer.resourceValues[CResource.gold] = 12;
		engineContext.activePlayer.resourceValues[CResource.ap] = 1;

		const [actionId, royalDecree] = engineContext.actions
			.entries()
			.find(([, def]) => def.effects.some(isEffectGroup))!;
		const group = royalDecree.effects.find(isEffectGroup)!;
		const option = group.options[0]!;
		const nestedAction = engineContext.actions.get(option.actionId);
		if (!nestedAction) {
			throw new Error(
				`Missing nested action definition for id "${option.actionId}".`,
			);
		}
		const nestedDevelopmentEffect = nestedAction.effects.find(
			(candidate) =>
				candidate.type === 'development' && candidate.method === 'add',
		);
		if (!nestedDevelopmentEffect) {
			throw new Error(
				`Missing development:add effect for action "${nestedAction.id}".`,
			);
		}
		const developmentParams = nestedDevelopmentEffect.params as {
			id?: unknown;
			developmentId?: unknown;
		};
		const effectDevelopmentId =
			typeof developmentParams.id === 'string'
				? developmentParams.id
				: typeof developmentParams.developmentId === 'string'
					? developmentParams.developmentId
					: undefined;
		if (!effectDevelopmentId) {
			throw new Error(
				`Missing development id for action "${nestedAction.id}".`,
			);
		}
		const developmentId = effectDevelopmentId;

		performAction(actionId, engineContext, {
			choices: {
				[group.id]: { optionId: option.id },
			},
		});

		expect(engineContext.activePlayer.lands).toHaveLength(beforeLandCount + 1);
		const newestLand = engineContext.activePlayer.lands.at(-1);
		expect(newestLand?.tilled).toBe(true);
		expect(newestLand?.developments).toContain(developmentId);
	});
});
