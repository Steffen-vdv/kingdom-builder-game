import { describe, it, expect } from 'vitest';
import { actionPoolRemove, type EffectDef } from '../../src/effects';
import type { EngineContext } from '../../src/context';

function createMockContext(
	overrides: Partial<EngineContext> = {},
): EngineContext {
	return {
		activePlayer: {
			actionStates: {},
			...overrides.activePlayer,
		},
		...overrides,
	} as unknown as EngineContext;
}

describe('action:pool-remove effect', () => {
	it('sets poolLocked to true for target action', () => {
		const context = createMockContext({
			activePlayer: {
				actionStates: {
					'test-action': {
						locked: false,
						poolLocked: false,
						currentTier: 1,
						exhausted: false,
					},
				},
			},
		});

		const effect: EffectDef = {
			type: 'action',
			method: 'pool-remove',
			params: { targetAction: 'test-action' },
		};

		actionPoolRemove(effect, context, 1);

		expect(context.activePlayer.actionStates['test-action']?.poolLocked).toBe(
			true,
		);
	});

	it('handles actions already removed from pool (poolLocked already true)', () => {
		const context = createMockContext({
			activePlayer: {
				actionStates: {
					'test-action': {
						locked: false,
						poolLocked: true,
						currentTier: 1,
						exhausted: false,
					},
				},
			},
		});

		const effect: EffectDef = {
			type: 'action',
			method: 'pool-remove',
			params: { targetAction: 'test-action' },
		};

		// Should not throw
		expect(() => actionPoolRemove(effect, context, 1)).not.toThrow();
		expect(context.activePlayer.actionStates['test-action']?.poolLocked).toBe(
			true,
		);
	});

	it('floors decimal multipliers', () => {
		const context = createMockContext({
			activePlayer: {
				actionStates: {
					'test-action': {
						locked: false,
						poolLocked: false,
						currentTier: 1,
						exhausted: false,
					},
				},
			},
		});

		const effect: EffectDef = {
			type: 'action',
			method: 'pool-remove',
			params: { targetAction: 'test-action' },
		};

		// Multiplier 2.9 should run 2 times (but effect is idempotent)
		actionPoolRemove(effect, context, 2.9);

		expect(context.activePlayer.actionStates['test-action']?.poolLocked).toBe(
			true,
		);
	});

	it('throws when targetAction is missing', () => {
		const context = createMockContext();

		const effect: EffectDef = {
			type: 'action',
			method: 'pool-remove',
			params: {},
		};

		expect(() => actionPoolRemove(effect, context, 1)).toThrow(
			'action:pool-remove requires targetAction',
		);
	});

	it('throws when action has no state initialized', () => {
		const context = createMockContext({
			activePlayer: {
				actionStates: {},
			},
		});

		const effect: EffectDef = {
			type: 'action',
			method: 'pool-remove',
			params: { targetAction: 'missing-action' },
		};

		expect(() => actionPoolRemove(effect, context, 1)).toThrow(
			'has no state initialized',
		);
	});

	it('preserves other action state properties', () => {
		const context = createMockContext({
			activePlayer: {
				actionStates: {
					'test-action': {
						locked: true,
						poolLocked: false,
						currentTier: 3,
						exhausted: true,
					},
				},
			},
		});

		const effect: EffectDef = {
			type: 'action',
			method: 'pool-remove',
			params: { targetAction: 'test-action' },
		};

		actionPoolRemove(effect, context, 1);

		const state = context.activePlayer.actionStates['test-action'];
		expect(state?.poolLocked).toBe(true);
		expect(state?.locked).toBe(true);
		expect(state?.currentTier).toBe(3);
		expect(state?.exhausted).toBe(true);
	});
});
