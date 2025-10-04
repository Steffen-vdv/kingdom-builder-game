import { describe, it, expect } from 'vitest';
import { performAction, getActionCosts, advance } from '../../src';
import { createTestEngine } from '../helpers';
import { createContentFactory } from '../factories/content';
import { Resource as CResource } from '@kingdom-builder/contents';

describe('action:remove effect', () => {
	it('removes an action', () => {
		const content = createContentFactory();
		const extra = content.action();
		const remove = content.action({
			effects: [{ type: 'action', method: 'remove', params: { id: extra.id } }],
		});
		const ctx = createTestEngine(content);
		while (ctx.game.currentPhase !== 'main') {
			advance(ctx);
		}
		ctx.activePlayer.actions.add(extra.id);
		const cost = getActionCosts(remove.id, ctx);
		ctx.activePlayer.ap = cost[CResource.ap] ?? 0;
		performAction(remove.id, ctx);
		expect(ctx.activePlayer.actions.has(extra.id)).toBe(false);
	});
});
