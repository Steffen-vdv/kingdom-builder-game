import { describe, it, expect, vi } from 'vitest';
import { performAction, getActionCosts, advance } from '../../src';
import { createTestEngine } from '../helpers';
import { createContentFactory } from '@kingdom-builder/testing';
import { Resource as CResource, PhaseId } from '@kingdom-builder/contents';
import { actionRemove, type EffectDef } from '../../src/effects';
import type { EngineContext } from '../../src/context';

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
		engineContext.activePlayer.resourceValues[CResource.ap] =
			cost[CResource.ap] ?? 0;
		performAction(remove.id, engineContext);
		expect(engineContext.activePlayer.actions.has(extra.id)).toBe(false);
	});

	it('floors multiplier values when deleting actions repeatedly', () => {
		const content = createContentFactory();
		const extra = content.action();
		const deleteSpy = vi.fn();
		const context = {
			activePlayer: {
				actions: {
					delete: deleteSpy,
				},
			},
		} as unknown as EngineContext;
		const effect: EffectDef = {
			type: 'action',
			method: 'remove',
			params: { id: extra.id },
		};
		actionRemove(effect, context, 2.3);
		expect(deleteSpy).toHaveBeenCalledTimes(2);
		expect(deleteSpy).toHaveBeenCalledWith(extra.id);
	});

	it('throws when action identifiers are missing', () => {
		const context = {
			activePlayer: {
				actions: {
					delete: vi.fn(),
				},
			},
		} as unknown as EngineContext;
		expect(() =>
			actionRemove(
				{
					type: 'action',
					method: 'remove',
					params: {},
				} as EffectDef,
				context,
				1,
			),
		).toThrow('action:remove requires id');
	});
});
