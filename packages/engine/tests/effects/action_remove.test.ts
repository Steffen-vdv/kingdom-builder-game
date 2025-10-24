import { describe, it, expect } from 'vitest';
import { performAction, getActionCosts, advance } from '../../src';
import { createTestEngine } from '../helpers';
import { createContentFactory } from '@kingdom-builder/testing';
import { Resource as CResource, PhaseId } from '@kingdom-builder/contents';

describe('action:remove effect', () => {
	it('removes an action', () => {
		const content = createContentFactory();
		const extra = content.action();
		const remove = content.action({
			effects: [{ type: 'action', method: 'remove', params: { id: extra.id } }],
		});
		const engineContext = createTestEngine(content);
		while (engineContext.game.currentPhase !== PhaseId.Main) {
			advance(engineContext);
		}
		engineContext.activePlayer.actions.add(extra.id);
		const cost = getActionCosts(remove.id, engineContext);
		engineContext.activePlayer.ap = cost[CResource.ap] ?? 0;
		performAction(remove.id, engineContext);
		expect(engineContext.activePlayer.actions.has(extra.id)).toBe(false);
	});
});
