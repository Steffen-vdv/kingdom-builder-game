import { describe, it, expect } from 'vitest';
import { actionExhaustedEvaluator } from '../../src/evaluators/action_exhausted';
import { createTestEngine } from '../helpers';

describe('action-exhausted evaluator', () => {
	it('returns 0 when no actions are exhausted', () => {
		const context = createTestEngine({ skipInitialSetup: true });
		context.activePlayer.actionStates['a'] = {
			locked: false,
			poolLocked: false,
			currentTier: 1,
			exhausted: false,
			usesThisTurn: 0,
		};
		const result = actionExhaustedEvaluator(
			{ type: 'action-exhausted' },
			context,
		);
		expect(result).toBe(0);
	});

	it('counts all exhausted actions', () => {
		const context = createTestEngine({ skipInitialSetup: true });
		context.activePlayer.actionStates['a'] = {
			locked: false,
			poolLocked: false,
			currentTier: 1,
			exhausted: true,
			usesThisTurn: 0,
		};
		context.activePlayer.actionStates['b'] = {
			locked: false,
			poolLocked: false,
			currentTier: 1,
			exhausted: true,
			usesThisTurn: 0,
		};
		context.activePlayer.actionStates['c'] = {
			locked: false,
			poolLocked: false,
			currentTier: 1,
			exhausted: false,
			usesThisTurn: 0,
		};
		const result = actionExhaustedEvaluator(
			{ type: 'action-exhausted' },
			context,
		);
		expect(result).toBe(2);
	});

	it('filters by metaCategory when specified', () => {
		const context = createTestEngine();
		// Use real actions from the content registry
		// Mark some as exhausted
		const actionIds = Array.from(context.actions.keys()).filter((id) => {
			const def = context.actions.get(id);
			return def && !def.system;
		});
		if (actionIds.length < 2) {
			return;
		}
		const firstId = actionIds[0]!;
		const firstDef = context.actions.get(firstId)!;
		const firstMetaCat = firstDef.metaCategory;

		// Exhaust the first action
		if (context.activePlayer.actionStates[firstId]) {
			context.activePlayer.actionStates[firstId].exhausted = true;
		}

		const result = actionExhaustedEvaluator(
			{
				type: 'action-exhausted',
				params: { metaCategory: firstMetaCat },
			},
			context,
		);
		expect(result).toBeGreaterThanOrEqual(1);
	});
});
