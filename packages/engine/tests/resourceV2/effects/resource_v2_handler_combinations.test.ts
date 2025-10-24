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

type BoundOverrides = { lowerBound?: number; upperBound?: number };

interface GroupedContextOptions {
	readonly childBounds?: BoundOverrides;
	readonly siblingBounds?: BoundOverrides;
	readonly parentBounds?: BoundOverrides;
}

interface GroupedContext {
	readonly primaryId: string;
	readonly siblingId: string;
	readonly parentId: string;
	readonly active: PlayerState;
	readonly opponent: PlayerState;
	readonly activeState: PlayerState['resourceV2'];
	readonly opponentState: PlayerState['resourceV2'];
	readonly service: ResourceV2Service;
	readonly context: EngineContext;
}

function createGroupedContext(
	options: GroupedContextOptions = {},
): GroupedContext {
	const group = createResourceV2Group({
		id: 'group-primary',
		children: ['primary-resource', 'support-resource'],
		parentBounds: options.parentBounds ?? {
			lowerBound: 0,
			upperBound: 30,
		},
		parentTrackBoundBreakdown: true,
	});
	const primary = createResourceV2Definition({
		id: 'primary-resource',
		bounds: options.childBounds ?? {
			lowerBound: 2,
			upperBound: 20,
		},
		group: { groupId: group.id, order: 0 },
		trackBoundBreakdown: true,
	});
	const sibling = createResourceV2Definition({
		id: 'support-resource',
		bounds: options.siblingBounds ?? {
			lowerBound: 0,
			upperBound: 15,
		},
		group: { groupId: group.id, order: 1 },
	});

	const registry = loadResourceV2Registry({
		resources: [primary, sibling],
		groups: [group],
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
		recentResourceGains: [] as { key: string; amount: number }[],
	} as unknown as EngineContext;

	return {
		primaryId: primary.id,
		siblingId: sibling.id,
		parentId: group.parent.id,
		active,
		opponent,
		activeState,
		opponentState,
		service,
		context,
	};
}

describe('ResourceV2 handler combination scenarios', () => {
	it('clamps rounded percent additions with suppressed hooks and maintains parent aggregation', () => {
		const { primaryId, siblingId, parentId, activeState, context, service } =
			createGroupedContext();

		const gainHooks: unknown[] = [];
		service.registerOnGain((payload) => gainHooks.push(payload));

		activeState.amounts[primaryId] = 18;
		activeState.amounts[siblingId] = 4;
		context.recentResourceGains = [];

		const effect: EffectDef = {
			type: 'resource',
			method: 'add',
			params: { id: primaryId, percent: 25 },
			meta: {
				reconciliation: 'clamp',
				suppressHooks: { reason: 'prevent-add-hooks' },
			},
			round: 'up',
		};

		resourceV2AddHandler(effect, context, 1);

		expect(activeState.amounts[primaryId]).toBe(20);
		expect(activeState.recentDeltas[primaryId]).toBe(2);
		expect(activeState.hookSuppressions[primaryId]).toBe('prevent-add-hooks');
		expect(gainHooks).toHaveLength(0);
		expect(activeState.amounts[parentId]).toBe(
			activeState.amounts[primaryId] + activeState.amounts[siblingId],
		);
		expect(activeState.touched[parentId]).toBe(true);
		expect(context.recentResourceGains).toEqual([
			{ key: primaryId, amount: 2 },
		]);
	});

	it('rounds percent removals down with clamp reconciliation and suppresses hooks while updating parents', () => {
		const { primaryId, siblingId, parentId, activeState, context, service } =
			createGroupedContext();

		const lossHooks: unknown[] = [];
		service.registerOnLoss((payload) => lossHooks.push(payload));

		activeState.amounts[primaryId] = 7;
		activeState.amounts[siblingId] = 5;
		context.recentResourceGains = [];

		const effect: EffectDef = {
			type: 'resource',
			method: 'remove',
			params: { id: primaryId, percent: 60 },
			meta: {
				reconciliation: 'clamp',
				suppressHooks: { reason: 'prevent-remove-hooks' },
			},
			round: 'down',
		};

		resourceV2RemoveHandler(effect, context, 1);

		expect(activeState.amounts[primaryId]).toBe(3);
		expect(activeState.recentDeltas[primaryId]).toBe(-4);
		expect(activeState.hookSuppressions[primaryId]).toBe(
			'prevent-remove-hooks',
		);
		expect(lossHooks).toHaveLength(0);
		expect(activeState.amounts[parentId]).toBe(
			activeState.amounts[primaryId] + activeState.amounts[siblingId],
		);
		expect(context.recentResourceGains).toEqual([
			{ key: primaryId, amount: -4 },
		]);
	});

	it('applies rounded percent transfers without mutating limited parents and honours hook suppression', () => {
		const {
			primaryId,
			siblingId,
			parentId,
			activeState,
			opponentState,
			context,
			service,
		} = createGroupedContext();

		const gainHooks: Array<{
			amount: number;
			playerId: string;
		}> = [];
		const lossHooks: Array<{
			amount: number;
			playerId: string;
		}> = [];
		service.registerOnGain(({ amount, player }) => {
			gainHooks.push({ amount, playerId: player.id });
		});
		service.registerOnLoss(({ amount, player }) => {
			lossHooks.push({ amount, playerId: player.id });
		});

		opponentState.amounts[primaryId] = 9;
		opponentState.amounts[siblingId] = 1;
		activeState.amounts[primaryId] = 15;
		activeState.amounts[siblingId] = 2;
		context.recentResourceGains = [];

		const effect: EffectDef = {
			type: 'resource',
			method: 'transfer',
			params: { id: primaryId, percent: 50 },
			meta: {
				donor: {
					reconciliation: 'clamp',
					suppressHooks: { reason: 'donor-muted' },
				},
				recipient: { reconciliation: 'clamp' },
				usesPercent: true,
			},
			round: 'nearest',
		};

		resourceV2TransferHandler(effect, context, 1);

		expect(opponentState.amounts[primaryId]).toBe(4);
		expect(activeState.amounts[primaryId]).toBe(20);
		expect(opponentState.recentDeltas[primaryId]).toBe(-5);
		expect(activeState.recentDeltas[primaryId]).toBe(5);
		expect(opponentState.hookSuppressions[primaryId]).toBe('donor-muted');
		expect(lossHooks).toEqual([]);
		expect(gainHooks).toEqual([{ amount: 5, playerId: 'A' }]);
		expect(context.recentResourceGains).toEqual([
			{ key: primaryId, amount: 5 },
		]);
		expect(opponentState.amounts[parentId]).toBe(
			opponentState.amounts[primaryId] + opponentState.amounts[siblingId],
		);
		expect(activeState.amounts[parentId]).toBe(
			activeState.amounts[primaryId] + activeState.amounts[siblingId],
		);
		expect(opponentState.recentDeltas[parentId]).toBeUndefined();
		expect(activeState.recentDeltas[parentId]).toBeUndefined();
	});

	it('raises child bounds, flags parent history, and enables subsequent rounded gains', () => {
		const { primaryId, siblingId, parentId, activeState, context, service } =
			createGroupedContext({
				childBounds: { lowerBound: 2, upperBound: 10 },
				parentBounds: { lowerBound: 0, upperBound: 15 },
			});

		activeState.amounts[primaryId] = 9;
		activeState.amounts[siblingId] = 3;

		const boundEffect: EffectDef = {
			type: 'resource',
			method: 'upper-bound:increase',
			params: { id: primaryId, amount: 4 },
			meta: { reconciliation: 'clamp' },
		};

		resourceV2IncreaseUpperBoundHandler(boundEffect, context, 1);

		expect(activeState.bounds[primaryId]).toEqual({
			lowerBound: 2,
			upperBound: 14,
		});
		expect(activeState.boundHistory[primaryId]).toBe(true);
		expect(activeState.boundHistory[parentId]).toBe(true);
		expect(activeState.amounts[primaryId]).toBe(9);

		const gainHooks: Array<{
			amount: number;
			playerId: string;
		}> = [];
		service.registerOnGain(({ amount, player }) => {
			gainHooks.push({ amount, playerId: player.id });
		});
		context.recentResourceGains = [];

		const addEffect: EffectDef = {
			type: 'resource',
			method: 'add',
			params: { id: primaryId, percent: 50 },
			meta: { reconciliation: 'clamp' },
			round: 'down',
		};

		resourceV2AddHandler(addEffect, context, 1);

		expect(activeState.amounts[primaryId]).toBe(13);
		expect(activeState.recentDeltas[primaryId]).toBe(4);
		expect(activeState.amounts[parentId]).toBe(
			activeState.amounts[primaryId] + activeState.amounts[siblingId],
		);
		expect(gainHooks).toEqual([{ amount: 4, playerId: 'A' }]);
		expect(context.recentResourceGains).toEqual([
			{ key: primaryId, amount: 4 },
		]);
	});
});
