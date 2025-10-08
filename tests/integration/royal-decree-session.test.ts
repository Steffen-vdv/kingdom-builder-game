import { describe, it, expect } from 'vitest';
import { createEngineSession } from '@kingdom-builder/engine';
import { getLegacySessionContext } from '../../packages/web/src/state/getLegacySessionContext';
import {
	ACTIONS,
	BUILDINGS,
	DEVELOPMENTS,
	POPULATIONS,
	PHASES,
	GAME_START,
	RULES,
} from '@kingdom-builder/contents';

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

describe('royal decree via session', () => {
	it('resolves every development option', () => {
		const session = createEngineSession({
			actions: ACTIONS,
			buildings: BUILDINGS,
			developments: DEVELOPMENTS,
			populations: POPULATIONS,
			phases: PHASES,
			start: GAME_START,
			rules: RULES,
		});
		const ctx = getLegacySessionContext(session);
		while (ctx.game.currentPhase !== 'main') {
			session.advancePhase();
		}
		const [royalActionId, royalDecree] = ctx.actions
			.entries()
			.find(([, def]) => def.effects.some(isEffectGroup))!;
		const developGroup = royalDecree.effects.find(isEffectGroup);
		expect(developGroup).toBeDefined();
		const options = developGroup?.options ?? [];
		expect(options.length).toBeGreaterThan(0);
		for (const option of options) {
			expect(option.params?.['developmentId']).toBeDefined();
		}
		for (const option of options) {
			ctx.activePlayer.gold = 12;
			ctx.activePlayer.ap = 1;
			const beforeLands = ctx.activePlayer.lands.length;
			const newestBefore = ctx.activePlayer.lands.at(-1);
			const optionId = option.id;
			session.performAction(royalActionId, {
				choices: { [developGroup!.id]: { optionId } },
			});
			expect(ctx.activePlayer.lands.length).toBe(beforeLands + 1);
			const newest = ctx.activePlayer.lands.at(-1);
			expect(newest).not.toBe(newestBefore);
			expect(newest?.developments).toContain(option.params?.['developmentId']);
		}
	});
});
