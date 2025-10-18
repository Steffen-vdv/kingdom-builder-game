import { describe, expect, it } from 'vitest';
import { actionPerform } from '../../src/effects/action_perform';
import { advance } from '../../src';
import type { EffectDef } from '@kingdom-builder/protocol';
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
		const developGroupOption = engineContext.actions
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
		expect(() => actionPerform(effect, engineContext, 1)).not.toThrow();
		const newestLand = engineContext.activePlayer.lands.at(-1);
		expect(newestLand?.developments).toContain(developmentId);
	});
});
