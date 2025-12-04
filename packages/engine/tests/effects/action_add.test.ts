import { describe, it, expect, vi } from 'vitest';
import { performAction, getActionCosts, advance } from '../../src';
import { createTestEngine } from '../helpers';
import { createContentFactory } from '@kingdom-builder/testing';
import { Resource as CResource, PhaseId } from '@kingdom-builder/contents';
import { actionAdd, type EffectDef } from '../../src/effects';
import type { EngineContext } from '../../src/context';

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
		engineContext.activePlayer.resourceValues[CResource.ap] =
			grantActionCosts[CResource.ap] ?? 0;
		performAction(grantingActionDefinition.id, engineContext);
		expect(
			engineContext.activePlayer.actions.has(extraActionDefinition.id),
		).toBe(true);
	});

	it('runs once per whole-number multiplier and floors decimals', () => {
		const contentFactory = createContentFactory();
		const extraActionDefinition = contentFactory.action();
		const add = vi.fn();
		const effect: EffectDef = {
			type: 'action',
			method: 'add',
			params: { id: extraActionDefinition.id },
		};
		const context = {
			activePlayer: {
				actions: {
					add,
				},
			},
		} as unknown as EngineContext;
		actionAdd(effect, context, 2.75);
		expect(add).toHaveBeenCalledTimes(2);
		expect(add).toHaveBeenNthCalledWith(1, extraActionDefinition.id);
	});

	it('throws a helpful error when ids are omitted', () => {
		const context = {
			activePlayer: {
				actions: {
					add: vi.fn(),
				},
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
