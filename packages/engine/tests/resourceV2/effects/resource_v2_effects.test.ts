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

describe('ResourceV2 effect handlers', () => {
	function createContext(
		resourceOverrides: Parameters<typeof createResourceV2Definition>[0] = {},
	) {
		const definition = createResourceV2Definition(resourceOverrides);
		const registry = loadResourceV2Registry({ resources: [definition] });
		const player = new PlayerState('A', 'Alice');
		const state = initializePlayerResourceV2State(player, registry);
		const context = { activePlayer: player } as unknown as EngineContext;
		return { definition, player, state, context };
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
});
