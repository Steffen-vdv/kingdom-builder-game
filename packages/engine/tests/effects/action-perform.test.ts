import { describe, expect, it } from 'vitest';
import { actionPerform } from '../../src/effects/action_perform';
import { advance, type EffectDef } from '../../src';
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

function toMain(ctx: ReturnType<typeof createTestEngine>) {
	while (ctx.game.currentPhase !== 'main') {
		advance(ctx);
	}
}

describe('action:perform effect', () => {
	it('uses the declared action when id points at a development', () => {
		const ctx = createTestEngine();
		toMain(ctx);
		ctx.activePlayer.ap = 5;
		ctx.activePlayer.gold = 20;
		const newLandId = `${ctx.activePlayer.id}-L${ctx.activePlayer.lands.length + 1}`;
		const fallbackLand = new Land(newLandId, 2, true);
		ctx.activePlayer.lands.push(fallbackLand);
		const developGroupOption = ctx.actions
			.entries()
			.flatMap(([, def]) => def.effects)
			.filter(isEffectGroup)
			.flatMap((group) => group.options)
			.find((option) => option.params?.['developmentId'])!;
		const developmentId = String(developGroupOption.params?.['developmentId']);
		const nestedActionId = developGroupOption.actionId;
		const effect: EffectDef = {
			type: 'action',
			method: 'perform',
			params: {
				id: developmentId,
				actionId: nestedActionId,
				developmentId,
			},
		};
		expect(() => actionPerform(effect, ctx, 1)).not.toThrow();
		const newestLand = ctx.activePlayer.lands.at(-1);
		expect(newestLand?.developments).toContain(developmentId);
	});
});
