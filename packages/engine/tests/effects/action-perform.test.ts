import { describe, expect, it } from 'vitest';
import { actionPerform } from '../../src/effects/action_perform';
import { advance, resolveActionEffects, type EffectDef } from '../../src';
import { createTestEngine } from '../helpers';
import { Land } from '../../src/state';

interface EffectGroupOption {
	id: string;
	actionId: string;
	params?: Record<string, unknown>;
}

interface EffectGroup {
	options: EffectGroupOption[];
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

describe('action:perform effect', () => {
	it('uses the declared action when id points at a development', () => {
		const engineContext = createTestEngine();
		toMain(engineContext);
		engineContext.activePlayer.ap = 5;
		engineContext.activePlayer.gold = 20;
		const newLandId = `${engineContext.activePlayer.id}-L${engineContext.activePlayer.lands.length + 1}`;
		const fallbackLand = new Land(newLandId, 2, true);
		engineContext.activePlayer.lands.push(fallbackLand);
		const [royalDecreeId, royalDecree] = engineContext.actions
			.entries()
			.find(([, definition]) => definition.effects.some(isEffectGroup))!;
		const group = royalDecree.effects.find(isEffectGroup)!;
		const option = group.options[0];
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

		const params = {
			landId: fallbackLand.id,
			choices: {
				[group.id]: { optionId: option.id },
			},
		} as const;
		const resolved = resolveActionEffects(royalDecree, params);
		const toActionId = (effect: EffectDef) => {
			const actionParams = effect.params as
				| {
						__actionId?: string;
						actionId?: string;
						id?: string;
				  }
				| undefined;
			return (
				actionParams?.__actionId ?? actionParams?.actionId ?? actionParams?.id
			);
		};
		const performEffect = resolved.effects.find(
			(candidate): candidate is EffectDef =>
				candidate.type === 'action' &&
				candidate.method === 'perform' &&
				toActionId(candidate) === option.actionId,
		);
		if (!performEffect) {
			throw new Error(
				`Missing action:perform effect for option "${option.id}" in action "${royalDecreeId}".`,
			);
		}
		expect(() => actionPerform(performEffect, engineContext, 1)).not.toThrow();
		const newestLand = engineContext.activePlayer.lands.at(-1);
		expect(newestLand).toBe(fallbackLand);
		expect(newestLand?.developments).toContain(developmentId);
	});
});
