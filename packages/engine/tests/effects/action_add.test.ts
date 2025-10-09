import { describe, it, expect } from 'vitest';
import { performAction, getActionCosts, advance } from '../../src';
import { createTestEngine } from '../helpers';
import { createContentFactory } from '@kingdom-builder/testing';
import { Resource as CResource, PhaseId } from '@kingdom-builder/contents';

describe('action:add effect', () => {
	it('grants a new action', () => {
		const contentFactory = createContentFactory();
		const extraActionDefinition = contentFactory.action();
		const grantingActionDefinition = contentFactory.action({
			effects: [
				{
					type: 'action',
					method: 'add',
					params: { id: extraActionDefinition.id },
				},
			],
		});
		const engineContext = createTestEngine(contentFactory);
		while (engineContext.game.currentPhase !== PhaseId.Main) {
			advance(engineContext);
		}
		const grantActionCosts = getActionCosts(
			grantingActionDefinition.id,
			engineContext,
		);
		engineContext.activePlayer.ap = grantActionCosts[CResource.ap] ?? 0;
		performAction(grantingActionDefinition.id, engineContext);
		expect(
			engineContext.activePlayer.actions.has(extraActionDefinition.id),
		).toBe(true);
	});
});
