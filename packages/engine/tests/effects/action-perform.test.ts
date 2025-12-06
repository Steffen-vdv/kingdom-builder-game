import { describe, expect, it, vi } from 'vitest';
import { actionPerform } from '../../src/effects/action_perform';
import { advance, resolveActionEffects, type EffectDef } from '../../src';
import { createTestEngine } from '../helpers';
import { Land } from '../../src/state';
import { createContentFactory } from '@kingdom-builder/testing';
import * as protocol from '@kingdom-builder/protocol';
import type { ResolvedActionEffects } from '@kingdom-builder/protocol';
import { Resource as CResource } from '@kingdom-builder/contents';

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
		engineContext.activePlayer.resourceValues[CResource.ap] = 5;
		engineContext.activePlayer.resourceValues[CResource.gold] = 20;
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

	it('prefers registered actions and strips control-only params', () => {
		const content = createContentFactory();
		const preferred = content.action();
		const fallback = content.action();
		const context = createTestEngine({
			actions: content.actions,
			buildings: content.buildings,
			developments: content.developments,
			populations: content.populations,
		});
		const resolution: ResolvedActionEffects = {
			effects: [],
			groups: [],
			missingSelections: [],
			choices: {},
			params: {},
			steps: [],
		};
		const spy = vi
			.spyOn(protocol, 'resolveActionEffects')
			.mockReturnValue(resolution);
		const effect: EffectDef = {
			type: 'action',
			method: 'perform',
			params: {
				__actionId: preferred.id,
				actionId: fallback.id,
				id: fallback.id,
				choices: {},
				extra: 'value',
			},
		};
		try {
			actionPerform(effect, context, 1);
			const forwarded = spy.mock.calls[0]?.[1] as Record<string, unknown>;
			expect(spy.mock.calls[0]?.[0]?.id).toBe(preferred.id);
			expect(forwarded?.['__actionId']).toBeUndefined();
			expect(forwarded?.['actionId']).toBeUndefined();
			expect(context.actionTraces.at(-1)?.id).toBe(preferred.id);
		} finally {
			spy.mockRestore();
		}
	});

	it('throws descriptive errors when effect selections are missing', () => {
		const content = createContentFactory();
		const target = content.action();
		const context = createTestEngine({
			actions: content.actions,
			buildings: content.buildings,
			developments: content.developments,
			populations: content.populations,
		});
		const missingResolution: ResolvedActionEffects = {
			effects: [],
			groups: [],
			missingSelections: ['vitest:missing'],
			choices: {},
			params: {},
			steps: [],
		};
		const spy = vi
			.spyOn(protocol, 'resolveActionEffects')
			.mockReturnValue(missingResolution);
		const effect: EffectDef = {
			type: 'action',
			method: 'perform',
			params: { __actionId: target.id },
		};
		try {
			expect(() => actionPerform(effect, context, 1)).toThrow(
				/requires a selection for effect group "vitest:missing"/,
			);
		} finally {
			spy.mockRestore();
		}
	});

	it('fails when no action id candidates resolve to a definition', () => {
		const context = createTestEngine();
		const effect = { type: 'action', method: 'perform' } as EffectDef;
		expect(() => actionPerform(effect, context, 1)).toThrow(
			'action:perform requires id',
		);
	});
});
