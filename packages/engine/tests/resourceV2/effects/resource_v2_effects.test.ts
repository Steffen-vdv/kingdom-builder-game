import { describe, expect, it } from 'vitest';

import type { EffectDef } from '@kingdom-builder/protocol';
import {
	resourceV2AddHandler,
	resourceV2RemoveHandler,
} from '../../../src/resourceV2/effects/index.ts';
import { loadResourceV2Registry } from '../../../src/resourceV2/registry.ts';
import {
	PlayerState,
	initializePlayerResourceV2State,
} from '../../../src/state/index.ts';
import { createResourceV2Definition } from '@kingdom-builder/testing';
import type { EngineContext } from '../../../src/context.ts';
import { ResourceV2Service } from '../../../src/resourceV2/service.ts';

describe('ResourceV2 effect handlers', () => {
	function createContext(
		resourceOverrides: Parameters<typeof createResourceV2Definition>[0] = {},
	) {
		const definition = createResourceV2Definition(resourceOverrides);
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
		return { definition, player, state, context, service };
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
		const { definition, state, context, service } = createContext({
			bounds: { upperBound: 10, lowerBound: 0 },
		});
		const resourceId = definition.id;
		state.amounts[resourceId] = 10;

		const gainCalls: unknown[] = [];
		const lossCalls: unknown[] = [];
		service.registerOnGain((payload) => gainCalls.push(payload));
		service.registerOnLoss((payload) => lossCalls.push(payload));
		context.recentResourceGains = [];

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
		expect(gainCalls).toHaveLength(0);
		expect(lossCalls).toHaveLength(0);
		expect(context.recentResourceGains).toEqual([]);
	});

	it('records hook suppression reasons when provided', () => {
		const { definition, state, context, service } = createContext();
		const resourceId = definition.id;
		const gainCalls: unknown[] = [];
		const lossCalls: unknown[] = [];
		service.registerOnGain((payload) => gainCalls.push(payload));
		service.registerOnLoss((payload) => lossCalls.push(payload));
		context.recentResourceGains = [];

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
		expect(gainCalls).toHaveLength(0);
		expect(lossCalls).toHaveLength(0);
		expect(context.recentResourceGains).toEqual([
			{ key: resourceId, amount: 3 },
		]);
	});

	it('emits hooks for non-zero deltas and records signed recent gains', () => {
		const { definition, state, context, service } = createContext();
		const resourceId = definition.id;
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

		state.amounts[resourceId] = 2;
		context.recentResourceGains = [];

		const gainEffect: EffectDef = {
			type: 'resource',
			method: 'add',
			params: { id: resourceId, amount: 3 },
			meta: { reconciliation: 'clamp' },
		};

		resourceV2AddHandler(gainEffect, context, 1);

		expect(gainCalls).toEqual([{ amount: 3, playerId: 'A' }]);
		expect(lossCalls).toEqual([]);
		expect(context.recentResourceGains).toEqual([
			{ key: resourceId, amount: 3 },
		]);

		context.recentResourceGains = [];

		const removeEffect: EffectDef = {
			type: 'resource',
			method: 'remove',
			params: { id: resourceId, amount: 2 },
			meta: { reconciliation: 'clamp' },
		};

		resourceV2RemoveHandler(removeEffect, context, 1);

		expect(gainCalls).toHaveLength(1);
		expect(lossCalls).toEqual([{ amount: 2, playerId: 'A' }]);
		expect(context.recentResourceGains).toEqual([
			{ key: resourceId, amount: -2 },
		]);
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
});
