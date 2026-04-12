import { describe, it, expect } from 'vitest';
import { actionUpgrade, type EffectDef } from '../../src/effects';
import type { EngineContext } from '../../src/context';
import type { ActionConfig } from '@boardsmith/protocol';
import { RngService } from '../../src/services/rng_service';

function createMockContext(
	overrides: Partial<EngineContext> = {},
): EngineContext {
	return {
		activePlayer: {
			actionStates: {},
			...overrides.activePlayer,
		},
		actions: new Map(),
		rng: new RngService(1),
		...overrides,
	} as unknown as EngineContext;
}

function createMockAction(
	id: string,
	startingTier: number = 1,
	maxTier: number = 3,
	metaCategory: string = 'meta:test',
	system: boolean = false,
): ActionConfig {
	const tiers: Record<string, { effects: [] }> = {};
	for (let tier = startingTier; tier <= maxTier; tier++) {
		tiers[String(tier)] = { effects: [] };
	}
	return {
		id,
		name: `Action ${id}`,
		metaCategory,
		tiers,
		system,
	};
}

describe('action:upgrade effect', () => {
	describe('targetAction mode', () => {
		it('increments currentTier for target action', () => {
			const action = createMockAction('test-action', 1, 3);
			const context = createMockContext({
				actions: new Map([['test-action', action]]),
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
				method: 'upgrade',
				params: { targetAction: 'test-action' },
			};

			actionUpgrade(effect, context, 1);

			expect(
				context.activePlayer.actionStates['test-action']?.currentTier,
			).toBe(2);
		});

		it('applies multiple upgrades with multiplier', () => {
			const action = createMockAction('test-action', 1, 5);
			const context = createMockContext({
				actions: new Map([['test-action', action]]),
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
				method: 'upgrade',
				params: { targetAction: 'test-action' },
			};

			actionUpgrade(effect, context, 3);

			expect(
				context.activePlayer.actionStates['test-action']?.currentTier,
			).toBe(4);
		});

		it('floors decimal multipliers', () => {
			const action = createMockAction('test-action', 1, 5);
			const context = createMockContext({
				actions: new Map([['test-action', action]]),
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
				method: 'upgrade',
				params: { targetAction: 'test-action' },
			};

			actionUpgrade(effect, context, 2.9);

			expect(
				context.activePlayer.actionStates['test-action']?.currentTier,
			).toBe(3);
		});

		it('throws when action is already at max tier', () => {
			const action = createMockAction('test-action', 1, 3);
			const context = createMockContext({
				actions: new Map([['test-action', action]]),
				activePlayer: {
					actionStates: {
						'test-action': {
							locked: false,
							poolLocked: false,
							currentTier: 3,
							exhausted: false,
						},
					},
				},
			});

			const effect: EffectDef = {
				type: 'action',
				method: 'upgrade',
				params: { targetAction: 'test-action' },
			};

			expect(() => actionUpgrade(effect, context, 1)).toThrow(
				'is already at max tier',
			);
		});

		it('throws when action not found', () => {
			const context = createMockContext({
				actions: new Map(),
				activePlayer: {
					actionStates: {
						missing: {
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
				method: 'upgrade',
				params: { targetAction: 'missing' },
			};

			expect(() => actionUpgrade(effect, context, 1)).toThrow(
				'target "missing" not found',
			);
		});

		it('throws when action has no state', () => {
			const action = createMockAction('test-action', 1, 3);
			const context = createMockContext({
				actions: new Map([['test-action', action]]),
				activePlayer: {
					actionStates: {},
				},
			});

			const effect: EffectDef = {
				type: 'action',
				method: 'upgrade',
				params: { targetAction: 'test-action' },
			};

			expect(() => actionUpgrade(effect, context, 1)).toThrow(
				'has no state initialized',
			);
		});
	});

	describe('randomInMetaCategory mode', () => {
		it('upgrades a random action in the meta-category', () => {
			const action1 = createMockAction('action1', 1, 3, 'meta:research');
			const action2 = createMockAction('action2', 1, 3, 'meta:research');
			const context = createMockContext({
				actions: new Map([
					['action1', action1],
					['action2', action2],
				]),
				activePlayer: {
					actionStates: {
						action1: {
							locked: false,
							poolLocked: false,
							currentTier: 1,
							exhausted: false,
						},
						action2: {
							locked: false,
							poolLocked: false,
							currentTier: 1,
							exhausted: false,
						},
					},
				},
				rng: new RngService(42),
			});

			const effect: EffectDef = {
				type: 'action',
				method: 'upgrade',
				params: { randomInMetaCategory: 'meta:research' },
			};

			actionUpgrade(effect, context, 1);

			// One of them should be upgraded
			const tier1 = context.activePlayer.actionStates['action1']?.currentTier;
			const tier2 = context.activePlayer.actionStates['action2']?.currentTier;
			expect(tier1 === 2 || tier2 === 2).toBe(true);
			expect(tier1! + tier2!).toBe(3); // One at 2, one at 1
		});

		it('excludes system actions from random selection', () => {
			const system = createMockAction('system', 1, 3, 'meta:test', true);
			const regular = createMockAction('regular', 1, 3, 'meta:test', false);
			const context = createMockContext({
				actions: new Map([
					['system', system],
					['regular', regular],
				]),
				activePlayer: {
					actionStates: {
						system: {
							locked: false,
							poolLocked: false,
							currentTier: 1,
							exhausted: false,
						},
						regular: {
							locked: false,
							poolLocked: false,
							currentTier: 1,
							exhausted: false,
						},
					},
				},
				rng: new RngService(1),
			});

			const effect: EffectDef = {
				type: 'action',
				method: 'upgrade',
				params: { randomInMetaCategory: 'meta:test' },
			};

			actionUpgrade(effect, context, 1);

			// System action should not be upgraded
			expect(context.activePlayer.actionStates['system']?.currentTier).toBe(1);
			// Regular action should be upgraded
			expect(context.activePlayer.actionStates['regular']?.currentTier).toBe(2);
		});

		it('excludes actions at max tier from random selection', () => {
			const maxed = createMockAction('maxed', 1, 2, 'meta:test');
			const upgradeable = createMockAction('upgradeable', 1, 3, 'meta:test');
			const context = createMockContext({
				actions: new Map([
					['maxed', maxed],
					['upgradeable', upgradeable],
				]),
				activePlayer: {
					actionStates: {
						maxed: {
							locked: false,
							poolLocked: false,
							currentTier: 2, // Already at max
							exhausted: false,
						},
						upgradeable: {
							locked: false,
							poolLocked: false,
							currentTier: 1,
							exhausted: false,
						},
					},
				},
				rng: new RngService(1),
			});

			const effect: EffectDef = {
				type: 'action',
				method: 'upgrade',
				params: { randomInMetaCategory: 'meta:test' },
			};

			actionUpgrade(effect, context, 1);

			// Maxed action should stay at 2
			expect(context.activePlayer.actionStates['maxed']?.currentTier).toBe(2);
			// Upgradeable action should be upgraded
			expect(
				context.activePlayer.actionStates['upgradeable']?.currentTier,
			).toBe(2);
		});

		it('throws when no upgradeable actions in meta-category', () => {
			const maxed = createMockAction('maxed', 1, 2, 'meta:test');
			const context = createMockContext({
				actions: new Map([['maxed', maxed]]),
				activePlayer: {
					actionStates: {
						maxed: {
							locked: false,
							poolLocked: false,
							currentTier: 2, // Already at max
							exhausted: false,
						},
					},
				},
				rng: new RngService(1),
			});

			const effect: EffectDef = {
				type: 'action',
				method: 'upgrade',
				params: { randomInMetaCategory: 'meta:test' },
			};

			expect(() => actionUpgrade(effect, context, 1)).toThrow(
				'has no upgradeable actions',
			);
		});

		it('excludes actions without state from random selection', () => {
			const withState = createMockAction('with-state', 1, 3, 'meta:test');
			const withoutState = createMockAction('without-state', 1, 3, 'meta:test');
			const context = createMockContext({
				actions: new Map([
					['with-state', withState],
					['without-state', withoutState],
				]),
				activePlayer: {
					actionStates: {
						'with-state': {
							locked: false,
							poolLocked: false,
							currentTier: 1,
							exhausted: false,
						},
						// without-state has no entry
					},
				},
				rng: new RngService(1),
			});

			const effect: EffectDef = {
				type: 'action',
				method: 'upgrade',
				params: { randomInMetaCategory: 'meta:test' },
			};

			actionUpgrade(effect, context, 1);

			// Only with-state should be upgraded
			expect(context.activePlayer.actionStates['with-state']?.currentTier).toBe(
				2,
			);
		});
	});

	describe('validation', () => {
		it('throws when neither targetAction nor randomInMetaCategory', () => {
			const context = createMockContext();

			const effect: EffectDef = {
				type: 'action',
				method: 'upgrade',
				params: {},
			};

			expect(() => actionUpgrade(effect, context, 1)).toThrow(
				'requires either targetAction or randomInMetaCategory',
			);
		});
	});
});
