import { describe, expect, it } from 'vitest';

import type { EffectDef } from '@kingdom-builder/protocol';
import {
	resourceV2AddHandler,
	resourceV2IncreaseUpperBoundHandler,
	resourceV2RemoveHandler,
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

describe('ResourceV2 handler combinations', () => {
	function createSinglePlayerContext() {
		const group = createResourceV2Group({
			children: ['child'],
			parentTrackBoundBreakdown: true,
		});
		const definition = createResourceV2Definition({
			id: 'child',
			bounds: { lowerBound: 5, upperBound: 20 },
			trackBoundBreakdown: true,
			group: { groupId: group.id, order: 0 },
		});
		const registry = loadResourceV2Registry({
			resources: [definition],
			groups: [group],
		});
		const player = new PlayerState('A', 'Alice');
		initializePlayerResourceV2State(player, registry);
		const service = new ResourceV2Service(registry);
		const context = {
			activePlayer: player,
			resourceV2: service,
			recentResourceGains: [] as {
				key: string;
				amount: number;
			}[],
		} as unknown as EngineContext;

		return {
			definition,
			parentId: group.parent.id,
			player,
			context,
			service,
		};
	}

	it('adds percent-based gains with rounding and suppressed hooks while updating parent aggregates', () => {
		const { definition, parentId, player, context, service } =
			createSinglePlayerContext();
		const resourceId = definition.id;
		const state = player.resourceV2;
		state.amounts[resourceId] = 9;

		const gainHooks: unknown[] = [];
		const lossHooks: unknown[] = [];
		service.registerOnGain((payload) => gainHooks.push(payload));
		service.registerOnLoss((payload) => lossHooks.push(payload));

		const effect: EffectDef = {
			type: 'resource',
			method: 'add',
			params: { id: resourceId, percent: 37 },
			meta: {
				reconciliation: 'clamp',
				suppressHooks: { reason: 'prevent recursive triggers' },
			},
			round: 'down',
		};

		resourceV2AddHandler(effect, context, 2);

		expect(state.amounts[resourceId]).toBe(15);
		expect(state.amounts[parentId]).toBe(15);
		expect(state.touched[parentId]).toBe(true);
		expect(state.hookSuppressions[resourceId]).toBe(
			'prevent recursive triggers',
		);
		expect(state.hookSuppressions[parentId]).toBeUndefined();
		expect(context.recentResourceGains).toEqual([
			{ key: resourceId, amount: 6 },
		]);
		expect(gainHooks).toHaveLength(0);
		expect(lossHooks).toHaveLength(0);
	});

	it('removes percent-based amounts with rounding while honoring bounds and suppressed hooks', () => {
		const { definition, parentId, player, context, service } =
			createSinglePlayerContext();
		const resourceId = definition.id;
		const state = player.resourceV2;
		expect(definition.bounds).toEqual({
			lowerBound: 5,
			upperBound: 20,
		});
		state.amounts[resourceId] = 12;
		state.recentDeltas[resourceId] = 0;
		state.recentDeltas[parentId] = 0;
		expect(state.bounds[resourceId]).toEqual({
			lowerBound: 5,
			upperBound: 20,
		});

		const gainHooks: unknown[] = [];
		const lossHooks: unknown[] = [];
		service.registerOnGain((payload) => gainHooks.push(payload));
		service.registerOnLoss((payload) => lossHooks.push(payload));

		const effect: EffectDef = {
			type: 'resource',
			method: 'remove',
			params: { id: resourceId, percent: 60 },
			meta: {
				reconciliation: 'clamp',
				suppressHooks: { reason: 'loss guard' },
			},
			round: 'up',
		};

		resourceV2RemoveHandler(effect, context, 1);

		expect(state.amounts[resourceId]).toBe(5);
		expect(state.amounts[parentId]).toBe(5);
		expect(state.touched[parentId]).toBe(true);
		expect(state.recentDeltas[resourceId]).toBe(-7);
		expect(state.hookSuppressions[resourceId]).toBe('loss guard');
		expect(context.recentResourceGains).toEqual([
			{ key: resourceId, amount: -7 },
		]);
		expect(gainHooks).toHaveLength(0);
		expect(lossHooks).toHaveLength(0);
	});
});

describe('ResourceV2 transfer with bounded resources', () => {
	function createTransferContext() {
		const definition = createResourceV2Definition({
			bounds: { lowerBound: 2, upperBound: 10 },
		});
		const registry = loadResourceV2Registry({
			resources: [definition],
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

		return { definition, active, opponent, context, service };
	}

	it('limits donor and recipient changes to available capacity with suppressed hooks', () => {
		const { definition, active, opponent, context, service } =
			createTransferContext();
		const resourceId = definition.id;
		const activeState = active.resourceV2;
		const opponentState = opponent.resourceV2;
		opponentState.amounts[resourceId] = 7;
		activeState.amounts[resourceId] = 9;

		const gainHooks: unknown[] = [];
		const lossHooks: unknown[] = [];
		service.registerOnGain((payload) => gainHooks.push(payload));
		service.registerOnLoss((payload) => lossHooks.push(payload));

		const effect: EffectDef = {
			type: 'resource',
			method: 'transfer',
			params: { id: resourceId, percent: 80 },
			meta: {
				donor: {
					reconciliation: 'clamp',
					suppressHooks: { reason: 'donor freeze' },
				},
				recipient: {
					reconciliation: 'clamp',
					suppressHooks: { reason: 'recipient freeze' },
				},
				usesPercent: true,
			},
			round: 'up',
		};

		resourceV2TransferHandler(effect, context, 2);

		expect(opponentState.amounts[resourceId]).toBe(6);
		expect(activeState.amounts[resourceId]).toBe(10);
		expect(opponentState.recentDeltas[resourceId]).toBe(-1);
		expect(activeState.recentDeltas[resourceId]).toBe(1);
		expect(opponentState.hookSuppressions[resourceId]).toBe('donor freeze');
		expect(activeState.hookSuppressions[resourceId]).toBe('recipient freeze');
		expect(context.recentResourceGains).toEqual([
			{ key: resourceId, amount: 1 },
		]);
		expect(gainHooks).toHaveLength(0);
		expect(lossHooks).toHaveLength(0);
	});
});

describe('ResourceV2 upper-bound adjustments with parents', () => {
	it('marks bound history on child and parent without altering derived totals', () => {
		const group = createResourceV2Group({
			children: ['child'],
			parentBounds: { upperBound: 5 },
			parentTrackBoundBreakdown: true,
		});
		const definition = createResourceV2Definition({
			id: 'child',
			bounds: { upperBound: 6 },
			trackBoundBreakdown: true,
			group: { groupId: group.id, order: 0 },
		});
		const registry = loadResourceV2Registry({
			resources: [definition],
			groups: [group],
		});
		const player = new PlayerState('A', 'Alice');
		initializePlayerResourceV2State(player, registry);
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
		const parentId = group.parent.id;
		const state = player.resourceV2;

		const effect: EffectDef = {
			type: 'resource',
			method: 'upper-bound:increase',
			params: { id: resourceId, amount: 2 },
			meta: { reconciliation: 'clamp' },
		};

		resourceV2IncreaseUpperBoundHandler(effect, context, 3);

		expect(state.bounds[resourceId]).toEqual({ upperBound: 12 });
		expect(state.bounds[parentId]).toEqual({ upperBound: 5 });
		expect(state.amounts[parentId]).toBe(0);
		expect(state.boundHistory[resourceId]).toBe(true);
		expect(state.boundHistory[parentId]).toBe(true);
		expect(state.touched[parentId]).toBe(false);
	});
});
