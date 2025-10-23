import { describe, expect, it } from 'vitest';

import type { EffectDef } from '@kingdom-builder/protocol';
import {
	resourceV2AddHandler,
	resourceV2RemoveHandler,
	resourceV2TransferHandler,
	resourceV2UpperBoundIncreaseHandler,
} from '../../../src/resourceV2/effects/index.ts';
import { loadResourceV2Registry } from '../../../src/resourceV2/registry.ts';
import {
	PlayerState,
	initializePlayerResourceV2State,
} from '../../../src/state/index.ts';
import {
	createResourceV2Definition,
	createResourceV2Group,
} from '@kingdom-builder/testing';
import type { EngineContext } from '../../../src/context.ts';

describe('ResourceV2 effect handlers', () => {
	function createContext(
		resourceOverrides: Parameters<typeof createResourceV2Definition>[0] = {},
	) {
		const definition = createResourceV2Definition(resourceOverrides);
		const registry = loadResourceV2Registry({
			resources: [definition],
		});
		const player = new PlayerState('A', 'Alice');
		const opponent = new PlayerState('B', 'Bob');
		const state = initializePlayerResourceV2State(player, registry);
		const opponentState = initializePlayerResourceV2State(opponent, registry);
		const context = {
			activePlayer: player,
			opponent,
		} as unknown as EngineContext;
		return {
			definition,
			player,
			opponent,
			state,
			opponentState,
			context,
		};
	}

	it('applies percent deltas with explicit rounding', () => {
		const { definition, state, context } = createContext();
		const resourceId = definition.id;
		state.amounts[resourceId] = 10;

		const effect: EffectDef = {
			type: 'resource',
			method: 'add',
			params: { id: resourceId, percent: 25 },
			meta: { reconciliation: 'clamp' },
			round: 'down',
		};

		resourceV2AddHandler(effect, context, 1);

		expect(state.amounts[resourceId]).toBe(12);
		expect(state.recentDeltas[resourceId]).toBe(2);
		expect(state.touched[resourceId]).toBe(true);
		expect(state.hookSuppressions[resourceId]).toBeUndefined();
	});

	it('rounds to nearest with ties upward when unspecified', () => {
		const { definition, state, context } = createContext();
		const resourceId = definition.id;
		state.amounts[resourceId] = 6;

		const effect: EffectDef = {
			type: 'resource',
			method: 'add',
			params: { id: resourceId, percent: 25 },
			meta: { reconciliation: 'clamp' },
		};

		resourceV2AddHandler(effect, context, 1);

		expect(state.amounts[resourceId]).toBe(8);
		expect(state.recentDeltas[resourceId]).toBe(2);
	});

	it('sums percent multipliers before rounding', () => {
		const { definition, state, context } = createContext();
		const resourceId = definition.id;
		state.amounts[resourceId] = 21;

		const effect: EffectDef = {
			type: 'resource',
			method: 'add',
			params: { id: resourceId, percent: 10 },
			meta: { reconciliation: 'clamp' },
			round: 'up',
		};

		resourceV2AddHandler(effect, context, 2);

		expect(state.amounts[resourceId]).toBe(26);
		expect(state.recentDeltas[resourceId]).toBe(5);
	});

	it('clamps values without marking touched when delta resolves to zero', () => {
		const { definition, state, context } = createContext({
			bounds: { upperBound: 10, lowerBound: 0 },
		});
		const resourceId = definition.id;
		state.amounts[resourceId] = 10;

		const effect: EffectDef = {
			type: 'resource',
			method: 'add',
			params: { id: resourceId, amount: 5 },
			meta: { reconciliation: 'clamp' },
		};

		resourceV2AddHandler(effect, context, 1);

		expect(state.amounts[resourceId]).toBe(10);
		expect(state.recentDeltas[resourceId]).toBe(0);
		expect(state.touched[resourceId]).toBe(false);
	});

	it('records hook suppression reasons when provided', () => {
		const { definition, state, context } = createContext();
		const resourceId = definition.id;

		const effect: EffectDef = {
			type: 'resource',
			method: 'add',
			params: { id: resourceId, amount: 3 },
			meta: {
				reconciliation: 'clamp',
				suppressHooks: { reason: 'Prevent recursive triggers.' },
			},
		};

		resourceV2AddHandler(effect, context, 1);

		expect(state.amounts[resourceId]).toBe(3);
		expect(state.recentDeltas[resourceId]).toBe(3);
		expect(state.hookSuppressions[resourceId]).toBe(
			'Prevent recursive triggers.',
		);
	});

	it('applies removal deltas and enforces lower bounds', () => {
		const { definition, state, context } = createContext({
			bounds: { lowerBound: 0 },
		});
		const resourceId = definition.id;
		state.amounts[resourceId] = 4;

		const effect: EffectDef = {
			type: 'resource',
			method: 'remove',
			params: { id: resourceId, amount: 3 },
			meta: { reconciliation: 'clamp' },
		};

		resourceV2RemoveHandler(effect, context, 1);

		expect(state.amounts[resourceId]).toBe(1);
		expect(state.recentDeltas[resourceId]).toBe(-3);
		expect(state.touched[resourceId]).toBe(true);

		const percentEffect: EffectDef = {
			type: 'resource',
			method: 'remove',
			params: { id: resourceId, percent: 50 },
			meta: { reconciliation: 'clamp' },
			round: 'up',
		};

		resourceV2RemoveHandler(percentEffect, context, 1);

		expect(state.amounts[resourceId]).toBe(0);
		expect(state.recentDeltas[resourceId]).toBe(-4);
	});

	describe('resource transfers', () => {
		it('moves amounts between players and records deltas', () => {
			const { definition, state, opponentState, context } = createContext({
				bounds: { lowerBound: 0, upperBound: 20 },
			});
			const resourceId = definition.id;
			state.amounts[resourceId] = 5;
			opponentState.amounts[resourceId] = 12;

			const effect: EffectDef = {
				type: 'resource',
				method: 'transfer',
				params: {
					donorId: resourceId,
					recipientId: resourceId,
					amount: 4,
				},
				meta: {
					donor: {
						reconciliation: 'clamp',
					},
					recipient: {
						reconciliation: 'clamp',
					},
				},
			};

			resourceV2TransferHandler(effect, context, 1);

			expect(opponentState.amounts[resourceId]).toBe(8);
			expect(state.amounts[resourceId]).toBe(9);
			expect(opponentState.recentDeltas[resourceId]).toBe(-4);
			expect(state.recentDeltas[resourceId]).toBe(4);
			expect(opponentState.hookSuppressions[resourceId]).toBeUndefined();
			expect(state.hookSuppressions[resourceId]).toBeUndefined();
		});

		it('respects hook suppression for donor/recipient pairs', () => {
			const { definition, state, opponentState, context } = createContext({
				bounds: { lowerBound: 0, upperBound: 5 },
			});
			const resourceId = definition.id;
			state.amounts[resourceId] = 4;
			opponentState.amounts[resourceId] = 3;

			const donorHooks = { reason: 'donor check' };
			const recipientHooks = { reason: 'recipient check' };

			const effect: EffectDef = {
				type: 'resource',
				method: 'transfer',
				params: {
					donorId: resourceId,
					recipientId: resourceId,
					amount: 5,
				},
				meta: {
					donor: {
						reconciliation: 'clamp',
						suppressHooks: donorHooks,
					},
					recipient: {
						reconciliation: 'clamp',
						suppressHooks: recipientHooks,
					},
				},
			};

			resourceV2TransferHandler(effect, context, 1);

			expect(opponentState.amounts[resourceId]).toBe(2);
			expect(state.amounts[resourceId]).toBe(5);
			expect(opponentState.recentDeltas[resourceId]).toBe(-1);
			expect(state.recentDeltas[resourceId]).toBe(1);
                        expect(
                                opponentState.hookSuppressions[resourceId],
                        ).toBe('donor check');
                        expect(
                                state.hookSuppressions[resourceId],
                        ).toBe('recipient check');
                });

                it('transfers percent values with rounding and metadata flag', () => {
                        const {
                                definition,
                                state,
                                opponentState,
                                context,
                        } = createContext();
                        const resourceId = definition.id;
                        opponentState.amounts[resourceId] = 9;
                        state.amounts[resourceId] = 1;

                        const effect: EffectDef = {
                                type: 'resource',
                                method: 'transfer',
                                params: {
                                        donorId: resourceId,
                                        recipientId: resourceId,
                                        percent: 40,
                                },
                                meta: {
                                        donor: { reconciliation: 'clamp' },
                                        recipient: { reconciliation: 'clamp' },
                                        usesPercent: true,
                                },
                                round: 'down',
                        };

                        resourceV2TransferHandler(effect, context, 1.5);

                        expect(opponentState.amounts[resourceId]).toBe(4);
                        expect(state.amounts[resourceId]).toBe(6);
                        expect(opponentState.recentDeltas[resourceId]).toBe(-5);
                        expect(state.recentDeltas[resourceId]).toBe(5);
                });

                it('refunds leftover amounts when the recipient clamps the gain', () => {
                        const {
                                definition,
                                state,
                                opponentState,
                                context,
                        } = createContext({
                                bounds: { lowerBound: 0, upperBound: 5 },
                        });
                        const resourceId = definition.id;
                        opponentState.amounts[resourceId] = 10;
                        state.amounts[resourceId] = 4;
                        opponentState.bounds[resourceId] = {
                                lowerBound: 0,
                                upperBound: 20,
                        };

                        const effect: EffectDef = {
                                type: 'resource',
                                method: 'transfer',
                                params: {
                                        donorId: resourceId,
                                        recipientId: resourceId,
                                        amount: 4,
                                },
                                meta: {
                                        donor: { reconciliation: 'clamp' },
                                        recipient: { reconciliation: 'clamp' },
                                },
                        };

                        resourceV2TransferHandler(effect, context, 1);

                        expect(opponentState.amounts[resourceId]).toBe(9);
                        expect(state.amounts[resourceId]).toBe(5);
                        expect(opponentState.recentDeltas[resourceId]).toBe(-1);
                        expect(state.recentDeltas[resourceId]).toBe(1);
                });

		it('rejects transfers targeting limited parents', () => {
			const childId = 'resource:child';
			const groupId = 'resource:group';
			const group = createResourceV2Group({
				id: groupId,
				parentBounds: { lowerBound: 0, upperBound: 15 },
				children: [childId],
			});
			const definition = createResourceV2Definition({
				id: childId,
				group: { groupId },
				bounds: { lowerBound: 0, upperBound: 10 },
			});
			const registry = loadResourceV2Registry({
				resources: [definition],
				groups: [group],
			});
			const active = new PlayerState('A', 'Alice');
			const opponent = new PlayerState('B', 'Bob');
			initializePlayerResourceV2State(active, registry);
			initializePlayerResourceV2State(opponent, registry);
			const context = {
				activePlayer: active,
				opponent,
			} as unknown as EngineContext;
			const parentId = group.parent.id;
			const parentGuardError =
				'ResourceV2 parent "' + parentId + '" value derives from its children.';

			const donorParentEffect: EffectDef = {
				type: 'resource',
				method: 'transfer',
				params: {
					donorId: parentId,
					recipientId: childId,
					amount: 1,
				},
				meta: {
					donor: { reconciliation: 'clamp' },
					recipient: { reconciliation: 'clamp' },
				},
			};

			expect(() => {
				resourceV2TransferHandler(donorParentEffect, context, 1);
			}).toThrow(parentGuardError);

			const recipientParentEffect: EffectDef = {
				type: 'resource',
				method: 'transfer',
				params: {
					donorId: childId,
					recipientId: parentId,
					amount: 1,
				},
				meta: {
					donor: { reconciliation: 'clamp' },
					recipient: { reconciliation: 'clamp' },
				},
			};

			expect(() => {
				resourceV2TransferHandler(recipientParentEffect, context, 1);
			}).toThrow(parentGuardError);
		});
	});

	describe('upper bound increases', () => {
		it('raises the upper bound without mutating amounts', () => {
			const { definition, state, context } = createContext({
				bounds: { lowerBound: 0, upperBound: 7 },
			});
			const resourceId = definition.id;
			state.amounts[resourceId] = 5;

			const effect: EffectDef = {
				type: 'resource',
				method: 'upper-bound:increase',
				params: { id: resourceId, amount: 3 },
				meta: {},
			};

			resourceV2UpperBoundIncreaseHandler(effect, context, 1);

			expect(state.bounds[resourceId]).toEqual({
				lowerBound: 0,
				upperBound: 10,
			});
			expect(state.amounts[resourceId]).toBe(5);
		});

		it('updates limited parent bounds without new totals', () => {
			const childId = 'resource:child';
			const groupId = 'resource:group';
			const group = createResourceV2Group({
				id: groupId,
				parentBounds: { lowerBound: 0, upperBound: 8 },
				children: [childId],
			});
			const definition = createResourceV2Definition({
				id: childId,
				group: { groupId },
				bounds: { lowerBound: 0, upperBound: 5 },
			});
			const registry = loadResourceV2Registry({
				resources: [definition],
				groups: [group],
			});
			const player = new PlayerState('A', 'Alice');
			const opponent = new PlayerState('B', 'Bob');
			const state = initializePlayerResourceV2State(player, registry);
			initializePlayerResourceV2State(opponent, registry);
			state.amounts[childId] = 4;
			const context = {
				activePlayer: player,
				opponent,
			} as unknown as EngineContext;
			const parentId = group.parent.id;

			const effect: EffectDef = {
				type: 'resource',
				method: 'upper-bound:increase',
				params: { id: parentId, amount: 4 },
				meta: {},
			};

			resourceV2UpperBoundIncreaseHandler(effect, context, 1);

			expect(state.bounds[parentId]).toEqual({
				lowerBound: 0,
				upperBound: 12,
			});
                        expect(state.amounts[parentId]).toBe(4);
                });

                it('ignores zero-delta requests without touching metadata', () => {
                        const { definition, state, context } = createContext({
                                bounds: { lowerBound: 0, upperBound: 6 },
                        });
                        const resourceId = definition.id;
                        state.amounts[resourceId] = 2;

                        const effect: EffectDef = {
                                type: 'resource',
                                method: 'upper-bound:increase',
                                params: { id: resourceId, amount: 0 },
                                meta: {},
                        };

                        resourceV2UpperBoundIncreaseHandler(effect, context, 5);

                        expect(state.bounds[resourceId]).toEqual({
                                lowerBound: 0,
                                upperBound: 6,
                        });
                        expect(state.touched[resourceId]).toBe(false);
                        expect(state.recentDeltas[resourceId]).toBe(0);
                });
        });
});
