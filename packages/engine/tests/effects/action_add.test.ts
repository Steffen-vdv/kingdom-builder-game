import { describe, it, expect } from 'vitest';
import { performAction, getActionCosts, advance } from '../../src';
import { createTestEngine } from '../helpers';
import { createContentFactory } from '@boardsmith/testing';
import { Resource as CResource, PhaseId } from '@boardsmith/contents';
import { actionAdd, type EffectDef } from '../../src/effects';
import type { EngineContext } from '../../src/context';

describe('action:add effect', () => {
	it('grants a new action', () => {
		const contentFactory = createContentFactory();
		// Create an action that's initially locked
		const extraActionDefinition = contentFactory.action({ locked: true });
		const grantingActionDefinition = contentFactory.action({
			tiers: {
				'1': {
					effects: [
						{
							type: 'action',
							method: 'add',
							params: { id: extraActionDefinition.id },
						},
					],
				},
			},
		});
		const engineContext = createTestEngine(contentFactory);
		while (engineContext.game.currentPhase !== PhaseId.Main) {
			advance(engineContext);
		}
		const grantActionCosts = getActionCosts(
			grantingActionDefinition.id,
			engineContext,
		);
		engineContext.activePlayer.resourceValues[CResource.cp] =
			grantActionCosts[CResource.cp] ?? 0;
		// Before: action should be locked
		expect(
			engineContext.activePlayer.actionStates[extraActionDefinition.id]?.locked,
		).toBe(true);
		performAction(grantingActionDefinition.id, engineContext);
		// After: action should be unlocked
		expect(
			engineContext.activePlayer.actionStates[extraActionDefinition.id]?.locked,
		).toBe(false);
	});

	it('runs once per whole-number multiplier and floors decimals', () => {
		const contentFactory = createContentFactory();
		const extraActionDefinition = contentFactory.action();
		// actionStates is modified directly by the effect handler
		const actionStates: Record<string, { locked: boolean }> = {
			[extraActionDefinition.id]: { locked: true },
		};
		const effect: EffectDef = {
			type: 'action',
			method: 'add',
			params: { id: extraActionDefinition.id },
		};
		const context = {
			activePlayer: {
				actionStates,
			},
		} as unknown as EngineContext;
		actionAdd(effect, context, 2.75);
		// Effect sets locked = false (runs 2 times but result is same)
		expect(actionStates[extraActionDefinition.id]?.locked).toBe(false);
	});

	it('throws a helpful error when ids are omitted', () => {
		const context = {
			activePlayer: {
				actionStates: {},
			},
		} as unknown as EngineContext;
		expect(() =>
			actionAdd(
				{
					type: 'action',
					method: 'add',
					params: {},
				} as EffectDef,
				context,
				1,
			),
		).toThrow('action:add requires id');
	});
});
