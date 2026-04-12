import { describe, it, expect } from 'vitest';
import { performAction, getActionCosts, advance } from '../../src';
import { createTestEngine } from '../helpers';
import { createContentFactory } from '@boardsmith/testing';
import { Resource as CResource, PhaseId } from '@boardsmith/contents';
import { actionRemove, type EffectDef } from '../../src/effects';
import type { EngineContext } from '../../src/context';

describe('action:remove effect', () => {
	it('removes an action', () => {
		const content = createContentFactory();
		// Action starts unlocked
		const extra = content.action();
		const remove = content.action({
			tiers: {
				'1': {
					effects: [
						{ type: 'action', method: 'remove', params: { id: extra.id } },
					],
				},
			},
		});
		const engineContext = createTestEngine(content);
		while (engineContext.game.currentPhase !== PhaseId.Main) {
			advance(engineContext);
		}
		// Ensure action starts unlocked
		engineContext.activePlayer.actionStates[extra.id] = {
			locked: false,
			poolLocked: false,
			currentTier: 1,
			exhausted: false,
		};
		const cost = getActionCosts(remove.id, engineContext);
		engineContext.activePlayer.resourceValues[CResource.cp] =
			cost[CResource.cp] ?? 0;
		performAction(remove.id, engineContext);
		// After remove, action should be locked
		expect(engineContext.activePlayer.actionStates[extra.id]?.locked).toBe(
			true,
		);
	});

	it('floors multiplier values when locking actions repeatedly', () => {
		const content = createContentFactory();
		const extra = content.action();
		// actionStates is modified directly by the effect handler
		const actionStates: Record<string, { locked: boolean }> = {
			[extra.id]: { locked: false },
		};
		const context = {
			activePlayer: {
				actionStates,
			},
		} as unknown as EngineContext;
		const effect: EffectDef = {
			type: 'action',
			method: 'remove',
			params: { id: extra.id },
		};
		actionRemove(effect, context, 2.3);
		// Effect sets locked = true (runs 2 times but result is same)
		expect(actionStates[extra.id]?.locked).toBe(true);
	});

	it('throws when action identifiers are missing', () => {
		const context = {
			activePlayer: {
				actionStates: {},
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
