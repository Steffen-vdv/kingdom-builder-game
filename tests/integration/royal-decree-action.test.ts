import { describe, it, expect } from 'vitest';
import {
	advance,
	getActionCosts,
	performAction,
	simulateAction,
	resolveActionEffects,
	type ActionEffectGroup,
	type ResolvedActionEffectGroup,
} from '@kingdom-builder/engine';
import { createTestEngine } from '../../packages/engine/tests/helpers';

function isGroup(effect: unknown): effect is ActionEffectGroup {
	return Boolean(effect && typeof effect === 'object' && 'options' in effect);
}

describe('royal decree action integration', () => {
	it('resolves each royal decree development option after simulation', () => {
		const ctx = createTestEngine();
		while (ctx.game.currentPhase !== 'main') {
			advance(ctx);
		}
		const entry = ctx.actions.entries().find(([, definition]) =>
			definition.effects.some(
				(effect) =>
					isGroup(effect) &&
					effect.options.every((option) => {
						const nested = ctx.actions.get(option.actionId);
						return nested.effects.some(
							(nestedEffect) =>
								nestedEffect.type === 'development' &&
								nestedEffect.method === 'add',
						);
					}),
			),
		);
		if (!entry) {
			throw new Error(
				'Failed to locate the decree action with development options',
			);
		}
		const [actionId, actionDefinition] = entry;
		const group = actionDefinition.effects.find(isGroup);
		expect(group).toBeDefined();
		const resolved = resolveActionEffects(actionDefinition, {
			landId: `${ctx.activePlayer.id}-L${ctx.activePlayer.lands.length + 1}`,
		});
		const resolvedGroup: ResolvedActionEffectGroup | undefined =
			resolved.groups.find((candidate) => candidate.group.id === group?.id);
		expect(resolvedGroup?.group.options).toBeDefined();

		const options = group?.options ?? [];
		expect(options.length).toBeGreaterThan(0);
		const results: string[] = [];
		for (const option of options) {
			const nextLandId = `${ctx.activePlayer.id}-L${ctx.activePlayer.lands.length + 1}`;
			const params = {
				landId: nextLandId,
				choices: {
					[group!.id]: {
						optionId: option.id,
						params: {
							...(option.params ?? {}),
							landId: nextLandId,
						},
					},
				},
			} as const;
			const costs = getActionCosts(actionId, ctx, params);
			ctx.activePlayer.ap = costs.ap ?? 0;
			ctx.activePlayer.gold = costs.gold ?? 0;
			expect(() => simulateAction(actionId, ctx, params)).not.toThrow();
			expect(() => performAction(actionId, ctx, params)).not.toThrow();
			const land = ctx.activePlayer.lands.find(
				(candidate) => candidate.id === nextLandId,
			);
			expect(land?.developments).toContain(option.params?.id);
			results.push(String(option.params?.id ?? ''));
		}
		expect(results.length).toBe(options.length);
	});
});
