import { describe, expect, it } from 'vitest';

import type { EffectDef } from '@kingdom-builder/protocol';
import {
	resourceV2IncreaseUpperBoundHandler,
	resourceV2TransferHandler,
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
import { ResourceV2Service } from '../../../src/resourceV2/service.ts';

type DefinitionOverrides = Parameters<typeof createResourceV2Definition>[0];
type ResourceGroupDefinitions = ReadonlyArray<
	ReturnType<typeof createResourceV2Group>
>;

describe('ResourceV2 transfer handler', () => {
	function createContext(
		overrides: DefinitionOverrides = {},
		groups: ResourceGroupDefinitions = [],
	) {
		const definition = createResourceV2Definition(overrides);
		const registry = loadResourceV2Registry({
			resources: [definition],
			groups,
		});

		const active = new PlayerState('A', 'Alice');
		const opponent = new PlayerState('B', 'Bob');
		const activeState = initializePlayerResourceV2State(active, registry);
		const opponentState = initializePlayerResourceV2State(opponent, registry);
		const service = new ResourceV2Service(registry);
		const context = {
			activePlayer: active,
			opponent,
			resourceV2: service,
			recentResourceGains: [] as {
				key: string;
				amount: number;
			}[],
		} as unknown as EngineContext;

		return {
			definition,
			registry,
			active,
			opponent,
			activeState,
			opponentState,
			context,
			service,
		};
	}

	it('transfers amounts with hook suppression metadata', () => {
		const { definition, activeState, opponentState, context } = createContext();
		const resourceId = definition.id;
		opponentState.amounts[resourceId] = 6;
		activeState.amounts[resourceId] = 1;

		const effect: EffectDef = {
			type: 'resource',
			method: 'transfer',
			params: { id: resourceId, amount: 4 },
			meta: {
				donor: {
					reconciliation: 'clamp',
					suppressHooks: {
						reason: 'donor guard',
					},
				},
				recipient: {
					reconciliation: 'clamp',
					suppressHooks: {
						reason: 'recipient guard',
					},
				},
			},
		};

		resourceV2TransferHandler(effect, context, 1);

		expect(opponentState.amounts[resourceId]).toBe(2);
		expect(activeState.amounts[resourceId]).toBe(5);
		expect(opponentState.recentDeltas[resourceId]).toBe(-4);
		expect(activeState.recentDeltas[resourceId]).toBe(4);
		expect(opponentState.touched[resourceId]).toBe(true);
		expect(activeState.touched[resourceId]).toBe(true);
		expect(opponentState.hookSuppressions[resourceId]).toBe('donor guard');
		expect(activeState.hookSuppressions[resourceId]).toBe('recipient guard');
	});

	it('emits hooks for both players but logs recipient gain only', () => {
		const { definition, activeState, opponentState, context, service } =
			createContext();
		const resourceId = definition.id;
		opponentState.amounts[resourceId] = 5;
		activeState.amounts[resourceId] = 0;
		const gainCalls: Array<{
			amount: number;
			playerId: string;
		}> = [];
		const lossCalls: Array<{
			amount: number;
			playerId: string;
		}> = [];
		service.registerOnGain(({ amount, player }) => {
			gainCalls.push({ amount, playerId: player.id });
		});
		service.registerOnLoss(({ amount, player }) => {
			lossCalls.push({ amount, playerId: player.id });
		});
		context.recentResourceGains = [];

		const effect: EffectDef = {
			type: 'resource',
			method: 'transfer',
			params: { id: resourceId, amount: 2 },
			meta: {
				donor: { reconciliation: 'clamp' },
				recipient: { reconciliation: 'clamp' },
			},
		};

		resourceV2TransferHandler(effect, context, 1);

		expect(gainCalls).toEqual([{ amount: 2, playerId: 'A' }]);
		expect(lossCalls).toEqual([{ amount: 2, playerId: 'B' }]);
		expect(context.recentResourceGains).toEqual([
			{ key: resourceId, amount: 2 },
		]);
	});

	it('clamps transfers when donor or recipient hit bounds', () => {
		const { definition, activeState, opponentState, context } = createContext({
			bounds: { lowerBound: 0, upperBound: 6 },
		});
		const resourceId = definition.id;
		opponentState.amounts[resourceId] = 2;
		activeState.amounts[resourceId] = 5;

		const effect: EffectDef = {
			type: 'resource',
			method: 'transfer',
			params: { id: resourceId, amount: 5 },
			meta: {
				donor: { reconciliation: 'clamp' },
				recipient: { reconciliation: 'clamp' },
			},
		};

		resourceV2TransferHandler(effect, context, 1);

		expect(opponentState.amounts[resourceId]).toBe(1);
		expect(activeState.amounts[resourceId]).toBe(6);
		expect(opponentState.recentDeltas[resourceId]).toBe(-1);
		expect(activeState.recentDeltas[resourceId]).toBe(1);
	});

	it('skips transfers when the requested amount resolves to zero', () => {
		const { definition, activeState, opponentState, context } = createContext();
		const resourceId = definition.id;
		opponentState.amounts[resourceId] = 3;
		activeState.amounts[resourceId] = 2;

		const effect: EffectDef = {
			type: 'resource',
			method: 'transfer',
			params: { id: resourceId, amount: 0 },
			meta: {
				donor: { reconciliation: 'clamp' },
				recipient: { reconciliation: 'clamp' },
			},
		};

		resourceV2TransferHandler(effect, context, 1);

		expect(opponentState.amounts[resourceId]).toBe(3);
		expect(activeState.amounts[resourceId]).toBe(2);
		expect(opponentState.touched[resourceId]).toBe(false);
		expect(activeState.touched[resourceId]).toBe(false);
		expect(opponentState.recentDeltas[resourceId]).toBe(0);
		expect(activeState.recentDeltas[resourceId]).toBe(0);
	});

	it('transfers percentage-based amounts with rounding', () => {
		const { definition, activeState, opponentState, context } = createContext();
		const resourceId = definition.id;
		opponentState.amounts[resourceId] = 7;
		activeState.amounts[resourceId] = 0;

		const effect: EffectDef = {
			type: 'resource',
			method: 'transfer',
			params: { id: resourceId, percent: 25 },
			meta: {
				donor: { reconciliation: 'clamp' },
				recipient: { reconciliation: 'clamp' },
				usesPercent: true,
			},
			round: 'up',
		};

		resourceV2TransferHandler(effect, context, 2);

		expect(opponentState.amounts[resourceId]).toBe(3);
		expect(activeState.amounts[resourceId]).toBe(4);
		expect(opponentState.recentDeltas[resourceId]).toBe(-4);
		expect(activeState.recentDeltas[resourceId]).toBe(4);
	});

	it('rejects transfers requesting negative amounts', () => {
		const { definition, context } = createContext();
		const effect: EffectDef = {
			type: 'resource',
			method: 'transfer',
			params: { id: definition.id, amount: -1 },
			meta: {
				donor: { reconciliation: 'clamp' },
				recipient: { reconciliation: 'clamp' },
			},
		};

		expect(() => resourceV2TransferHandler(effect, context, 1)).toThrow(
			'Transfer needs non-negative amount.',
		);
	});

	it('rejects transfers targeting aggregated parent resources', () => {
		const group = createResourceV2Group({ children: ['child'] });
		const child = createResourceV2Definition({
			id: 'child',
			group: { groupId: group.id, order: 0 },
		});
		const parentId = group.parent.id;
		const registry = loadResourceV2Registry({
			resources: [child],
			groups: [group],
		});
		const active = new PlayerState('A', 'Alice');
		const opponent = new PlayerState('B', 'Bob');
		initializePlayerResourceV2State(active, registry);
		initializePlayerResourceV2State(opponent, registry);
		const service = new ResourceV2Service(registry);
		const context = {
			activePlayer: active,
			opponent,
			resourceV2: service,
			recentResourceGains: [] as {
				key: string;
				amount: number;
			}[],
		} as unknown as EngineContext;

		const effect: EffectDef = {
			type: 'resource',
			method: 'transfer',
			params: { id: parentId, amount: 1 },
			meta: {
				donor: { reconciliation: 'clamp' },
				recipient: { reconciliation: 'clamp' },
			},
		};

		const attemptTransfer = () => resourceV2TransferHandler(effect, context, 1);

		expect(attemptTransfer).toThrow('ResourceV2 parent');
	});

	it('does not mutate donor resources when the recipient rejects the transfer', () => {
		const { definition, activeState, opponentState, context } = createContext();
		const resourceId = definition.id;
		opponentState.amounts[resourceId] = 7;
		activeState.amounts[resourceId] = 1;
		const donorBefore = opponentState.amounts[resourceId];

		activeState.parentChildren[resourceId] = Object.freeze(['synthetic-child']);

		const effect: EffectDef = {
			type: 'resource',
			method: 'transfer',
			params: { id: resourceId, amount: 3 },
			meta: {
				donor: { reconciliation: 'clamp' },
				recipient: { reconciliation: 'clamp' },
			},
		};

		const attemptTransfer = () => resourceV2TransferHandler(effect, context, 1);

		expect(attemptTransfer).toThrow('ResourceV2 parent');

		expect(opponentState.amounts[resourceId]).toBe(donorBefore);
		expect(opponentState.recentDeltas[resourceId]).toBe(0);
	});
});

describe('ResourceV2 upper bound increase handler', () => {
	it('raises upper bounds without altering current values', () => {
		const definition = createResourceV2Definition({
			bounds: { lowerBound: 0, upperBound: 5 },
			trackBoundBreakdown: true,
		});
		const registry = loadResourceV2Registry({
			resources: [definition],
		});
		const player = new PlayerState('A', 'Alice');
		const state = initializePlayerResourceV2State(player, registry);
		const service = new ResourceV2Service(registry);
		const context = {
			activePlayer: player,
			resourceV2: service,
			recentResourceGains: [] as {
				key: string;
				amount: number;
			}[],
		} as unknown as EngineContext;
		const resourceId = definition.id;
		state.amounts[resourceId] = 4;

		const effect: EffectDef = {
			type: 'resource',
			method: 'upper-bound:increase',
			params: { id: resourceId, amount: 3 },
			meta: { reconciliation: 'clamp' },
		};

		resourceV2IncreaseUpperBoundHandler(effect, context, 2);

		expect(state.bounds[resourceId]).toEqual({
			lowerBound: 0,
			upperBound: 11,
		});
		expect(state.amounts[resourceId]).toBe(4);
		expect(state.boundHistory[resourceId]).toBe(true);
	});

	it('skips bound history updates when tracking is disabled', () => {
		const definition = createResourceV2Definition({
			bounds: { upperBound: 5 },
			trackBoundBreakdown: false,
		});
		const registry = loadResourceV2Registry({
			resources: [definition],
		});
		const player = new PlayerState('A', 'Alice');
		const state = initializePlayerResourceV2State(player, registry);
		const service = new ResourceV2Service(registry);
		const context = {
			activePlayer: player,
			resourceV2: service,
			recentResourceGains: [] as {
				key: string;
				amount: number;
			}[],
		} as unknown as EngineContext;

		const effect: EffectDef = {
			type: 'resource',
			method: 'upper-bound:increase',
			params: { id: definition.id, amount: 3 },
			meta: { reconciliation: 'clamp' },
		};

		resourceV2IncreaseUpperBoundHandler(effect, context, 1);

		expect(state.bounds[definition.id]).toEqual({ upperBound: 8 });
		expect(state.boundHistory[definition.id]).toBe(false);
	});

	it('updates parent bounds without mutating derived totals', () => {
		const group = createResourceV2Group({
			children: ['child-a', 'child-b'],
			parentBounds: { upperBound: 6 },
			parentTrackBoundBreakdown: true,
		});
		const childA = createResourceV2Definition({
			id: 'child-a',
			group: { groupId: group.id, order: 0 },
		});
		const childB = createResourceV2Definition({
			id: 'child-b',
			group: { groupId: group.id, order: 1 },
		});
		const registry = loadResourceV2Registry({
			resources: [childA, childB],
			groups: [group],
		});
		const player = new PlayerState('A', 'Alice');
		const state = initializePlayerResourceV2State(player, registry);
		const service = new ResourceV2Service(registry);
		const context = {
			activePlayer: player,
			resourceV2: service,
			recentResourceGains: [] as {
				key: string;
				amount: number;
			}[],
		} as unknown as EngineContext;

		state.amounts['child-a'] = 3;
		state.amounts['child-b'] = 2;
		const parentId = group.parent.id;
		const beforeTotal = state.amounts[parentId];

		const effect: EffectDef = {
			type: 'resource',
			method: 'upper-bound:increase',
			params: { id: parentId, amount: 4 },
			meta: { reconciliation: 'clamp' },
		};

		resourceV2IncreaseUpperBoundHandler(effect, context, 1);

		expect(state.bounds[parentId]).toEqual({ upperBound: 10 });
		expect(state.amounts[parentId]).toBe(beforeTotal);
		expect(state.boundHistory[parentId]).toBe(true);
	});

	it('ignores increases that resolve to zero', () => {
		const definition = createResourceV2Definition({
			bounds: { lowerBound: 0, upperBound: 4 },
		});
		const registry = loadResourceV2Registry({
			resources: [definition],
		});
		const player = new PlayerState('A', 'Alice');
		const state = initializePlayerResourceV2State(player, registry);
		const service = new ResourceV2Service(registry);
		const context = {
			activePlayer: player,
			resourceV2: service,
			recentResourceGains: [] as {
				key: string;
				amount: number;
			}[],
		} as unknown as EngineContext;
		const resourceId = definition.id;

		const effect: EffectDef = {
			type: 'resource',
			method: 'upper-bound:increase',
			params: { id: resourceId, amount: 3 },
			meta: { reconciliation: 'clamp' },
		};

		resourceV2IncreaseUpperBoundHandler(effect, context, 0);

		expect(state.bounds[resourceId]).toEqual({
			lowerBound: 0,
			upperBound: 4,
		});
	});
});
