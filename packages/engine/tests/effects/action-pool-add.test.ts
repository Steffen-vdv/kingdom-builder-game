import { describe, it, expect } from 'vitest';
import { actionPoolAdd, type EffectDef } from '../../src/effects';
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

describe('action:pool-add effect', () => {
	it('sets poolLocked to false for target action', () => {
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
			method: 'pool-add',
			params: { targetAction: 'test-action' },
		};

		actionPoolAdd(effect, context, 1);

		expect(context.activePlayer.actionStates['test-action']?.poolLocked).toBe(
			false,
		);
	});

	it('handles actions already in pool (poolLocked already false)', () => {
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
			method: 'pool-add',
			params: { targetAction: 'test-action' },
		};

		// Should not throw
		expect(() => actionPoolAdd(effect, context, 1)).not.toThrow();
		expect(context.activePlayer.actionStates['test-action']?.poolLocked).toBe(
			false,
		);
	});

	it('floors decimal multipliers', () => {
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
			method: 'pool-add',
			params: { targetAction: 'test-action' },
		};

		// Multiplier 2.9 should run 2 times (but effect is idempotent)
		actionPoolAdd(effect, context, 2.9);

		expect(context.activePlayer.actionStates['test-action']?.poolLocked).toBe(
			false,
		);
	});

	it('throws when targetAction is missing', () => {
		const context = createMockContext();

		const effect: EffectDef = {
			type: 'action',
			method: 'pool-add',
			params: {},
		};

		expect(() => actionPoolAdd(effect, context, 1)).toThrow(
			'action:pool-add requires targetAction',
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
			method: 'pool-add',
			params: { targetAction: 'missing-action' },
		};

		expect(() => actionPoolAdd(effect, context, 1)).toThrow(
			'has no state initialized',
		);
	});

	it('preserves other action state properties', () => {
		const context = createMockContext({
			activePlayer: {
				actionStates: {
					'test-action': {
						locked: true,
						poolLocked: true,
						currentTier: 2,
						exhausted: true,
					},
				},
			},
		});

		const effect: EffectDef = {
			type: 'action',
			method: 'pool-add',
			params: { targetAction: 'test-action' },
		};

		actionPoolAdd(effect, context, 1);

		const state = context.activePlayer.actionStates['test-action'];
		expect(state?.poolLocked).toBe(false);
		expect(state?.locked).toBe(true);
		expect(state?.currentTier).toBe(2);
		expect(state?.exhausted).toBe(true);
	});
});
