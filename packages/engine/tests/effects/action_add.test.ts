import { describe, it, expect } from 'vitest';
import { performAction, getActionCosts, advance } from '../../src';
import { createTestEngine } from '../helpers';
import { createContentFactory } from '@kingdom-builder/testing';
import { Resource as CResource, PhaseId } from '@kingdom-builder/contents';

describe('action:add effect', () => {
	it('grants a new action', () => {
		const content = createContentFactory();
		const extra = content.action();
		const grant = content.action({
			effects: [{ type: 'action', method: 'add', params: { id: extra.id } }],
		});
		const ctx = createTestEngine(content);
		while (ctx.game.currentPhase !== PhaseId.Main) {
			advance(ctx);
		}
		const cost = getActionCosts(grant.id, ctx);
		ctx.activePlayer.ap = cost[CResource.ap] ?? 0;
		performAction(grant.id, ctx);
		expect(ctx.activePlayer.actions.has(extra.id)).toBe(true);
	});
});
