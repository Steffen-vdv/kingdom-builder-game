import { describe, expect, it } from 'vitest';

import type { EffectDef } from '@kingdom-builder/protocol';
import {
	createResourceV2Definition,
	createResourceV2Group,
} from '@kingdom-builder/testing';

import type { EngineContext } from '../../../src/context.ts';
import {
	PlayerState,
	initializePlayerResourceV2State,
} from '../../../src/state/index.ts';
import { ResourceV2Service } from '../../../src/resourceV2/service.ts';
import {
	resourceV2AddHandler,
	resourceV2IncreaseUpperBoundHandler,
	resourceV2RemoveHandler,
	resourceV2TransferHandler,
} from '../../../src/resourceV2/effects/index.ts';
import { loadResourceV2Registry } from '../../../src/resourceV2/registry.ts';

type RecentGainEntry = { key: string; amount: number };

const ADD_SUPPRESSION_REASON = 'suppress-add-hooks';
const REMOVE_SUPPRESSION_REASON = 'suppress-remove-hooks';
const DONOR_SUPPRESSION_REASON = 'suppress-donor-hooks';
const RECIPIENT_SUPPRESSION_REASON = 'suppress-recipient-hooks';
const ADD_SUPPRESSION_META = { reason: ADD_SUPPRESSION_REASON } as const;
const REMOVE_SUPPRESSION_META = { reason: REMOVE_SUPPRESSION_REASON } as const;
const DONOR_SUPPRESSION_META = { reason: DONOR_SUPPRESSION_REASON } as const;
const RECIPIENT_SUPPRESSION_META = {
	reason: RECIPIENT_SUPPRESSION_REASON,
} as const;

describe('ResourceV2 handler combinations', () => {
	function createGroupedContext() {
		const group = createResourceV2Group({
			children: ['child-resource'],
			parentBounds: { lowerBound: 0, upperBound: 50 },
			parentTrackBoundBreakdown: true,
		});
		const childId = group.children[0]!;
		const child = createResourceV2Definition({
			id: childId,
			bounds: { lowerBound: 1, upperBound: 10 },
			trackBoundBreakdown: true,
			group: { groupId: group.id, order: 0 },
		});

		const registry = loadResourceV2Registry({
			resources: [child],
			groups: [group],
		});
		const player = new PlayerState('A', 'Alice');
		const state = initializePlayerResourceV2State(player, registry);
		const service = new ResourceV2Service(registry);
		const context = {
			activePlayer: player,
			resourceV2: service,
			recentResourceGains: [] as RecentGainEntry[],
		} as unknown as EngineContext;

		return { group, child, player, state, service, context };
	}

	function createTransferContext() {
		const definition = createResourceV2Definition({
			bounds: { lowerBound: 5, upperBound: 20 },
			trackBoundBreakdown: true,
		});
		const registry = loadResourceV2Registry({
			resources: [definition],
		});

		const activePlayer = new PlayerState('Active', 'Active');
		const opponent = new PlayerState('Opponent', 'Opponent');
		const activeState = initializePlayerResourceV2State(activePlayer, registry);
		const opponentState = initializePlayerResourceV2State(opponent, registry);
		const service = new ResourceV2Service(registry);

		const context = {
			activePlayer,
			opponent,
			resourceV2: service,
			recentResourceGains: [] as RecentGainEntry[],
		} as unknown as EngineContext;

		return {
			definition,
			registry,
			activePlayer,
			opponent,
			activeState,
			opponentState,
			service,
			context,
		};
	}

	it('adds percent deltas with suppression and parent rollups', () => {
		const { group, child, state, service, context } = createGroupedContext();
		const parentId = group.parent.id;
		const resourceId = child.id;

		const gainEvents: unknown[] = [];
		const lossEvents: unknown[] = [];
		service.registerOnGain((payload) => gainEvents.push(payload));
		service.registerOnLoss((payload) => lossEvents.push(payload));

		state.amounts[resourceId] = 8;
		context.recentResourceGains = [];

		const effect: EffectDef = {
			type: 'resource',
			method: 'add',
			params: { id: resourceId, percent: 75 },
			meta: {
				reconciliation: 'clamp',
				suppressHooks: ADD_SUPPRESSION_META,
			},
			round: 'down',
		};

		resourceV2AddHandler(effect, context, 1);

		expect(state.amounts[resourceId]).toBe(10);
		expect(state.amounts[parentId]).toBe(10);
		expect(state.touched[parentId]).toBe(true);
		expect(state.recentDeltas[resourceId]).toBe(2);
		expect(state.hookSuppressions[resourceId]).toBe(ADD_SUPPRESSION_REASON);
		expect(context.recentResourceGains).toEqual([
			{ key: resourceId, amount: 2 },
		]);
		expect(gainEvents).toHaveLength(0);
		expect(lossEvents).toHaveLength(0);
	});

	it('removes percent deltas with suppression and parent rollups', () => {
		const { group, child, state, service, context } = createGroupedContext();
		const parentId = group.parent.id;
		const resourceId = child.id;

		const gainEvents: unknown[] = [];
		const lossEvents: unknown[] = [];
		service.registerOnGain((payload) => gainEvents.push(payload));
		service.registerOnLoss((payload) => lossEvents.push(payload));

		state.amounts[resourceId] = 4;
		context.recentResourceGains = [];

		const effect: EffectDef = {
			type: 'resource',
			method: 'remove',
			params: { id: resourceId, percent: 80 },
			meta: {
				reconciliation: 'clamp',
				suppressHooks: REMOVE_SUPPRESSION_META,
			},
			round: 'up',
		};

		resourceV2RemoveHandler(effect, context, 1);

		expect(state.amounts[resourceId]).toBe(1);
		expect(state.amounts[parentId]).toBe(1);
		expect(state.touched[parentId]).toBe(true);
		expect(state.recentDeltas[resourceId]).toBe(-3);
		expect(state.hookSuppressions[resourceId]).toBe(REMOVE_SUPPRESSION_REASON);
		expect(context.recentResourceGains).toEqual([
			{ key: resourceId, amount: -3 },
		]);
		expect(gainEvents).toHaveLength(0);
		expect(lossEvents).toHaveLength(0);
	});

	it('transfers percent values without exceeding clamp bounds', () => {
		const { definition, activeState, opponentState, service, context } =
			createTransferContext();
		const resourceId = definition.id;

		const gainEvents: unknown[] = [];
		const lossEvents: unknown[] = [];
		service.registerOnGain((payload) => gainEvents.push(payload));
		service.registerOnLoss((payload) => lossEvents.push(payload));

		opponentState.amounts[resourceId] = 20;
		activeState.amounts[resourceId] = 19;
		context.recentResourceGains = [];

		const effect: EffectDef = {
			type: 'resource',
			method: 'transfer',
			params: { id: resourceId, percent: 50 },
			meta: {
				donor: {
					reconciliation: 'clamp',
					suppressHooks: DONOR_SUPPRESSION_META,
				},
				recipient: {
					reconciliation: 'clamp',
					suppressHooks: RECIPIENT_SUPPRESSION_META,
				},
				usesPercent: true,
			},
			round: 'down',
		};

		resourceV2TransferHandler(effect, context, 1);

		expect(opponentState.amounts[resourceId]).toBe(19);
		expect(activeState.amounts[resourceId]).toBe(20);
		expect(opponentState.recentDeltas[resourceId]).toBe(-1);
		expect(activeState.recentDeltas[resourceId]).toBe(1);
		expect(opponentState.hookSuppressions[resourceId]).toBe(
			DONOR_SUPPRESSION_REASON,
		);
		expect(activeState.hookSuppressions[resourceId]).toBe(
			RECIPIENT_SUPPRESSION_REASON,
		);
		expect(context.recentResourceGains).toEqual([
			{ key: resourceId, amount: 1 },
		]);
		expect(gainEvents).toHaveLength(0);
		expect(lossEvents).toHaveLength(0);
	});

	it('raises child bounds and marks parent history', () => {
		const { group, child, state, context } = createGroupedContext();
		const parentId = group.parent.id;
		const resourceId = child.id;

		state.bounds[resourceId] = { lowerBound: 1, upperBound: 6 };
		state.boundHistory[resourceId] = false;
		state.boundHistory[parentId] = false;

		const effect: EffectDef = {
			type: 'resource',
			method: 'upper-bound:increase',
			params: { id: resourceId, amount: 2 },
			meta: { reconciliation: 'clamp' },
		};

		resourceV2IncreaseUpperBoundHandler(effect, context, 2);

		expect(state.bounds[resourceId]).toEqual({
			lowerBound: 1,
			upperBound: 10,
		});
		expect(state.boundHistory[resourceId]).toBe(true);
		expect(state.boundHistory[parentId]).toBe(true);
		expect(state.amounts[resourceId]).toBe(0);
	});
});
