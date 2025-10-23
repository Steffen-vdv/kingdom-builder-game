import { describe, expect, it } from 'vitest';
import { EFFECTS } from '../../src/effects/index.ts';
import { createTestEngine } from '../helpers.ts';
import { initializePlayerResourceV2State } from '../../src/state/index.ts';
import { loadResourceV2Registry } from '../../src/resourceV2/registry.ts';
import { createResourceV2Definition } from '@kingdom-builder/testing';

describe('ResourceV2 resource effect handlers', () => {
	it('applies percent rounding and records recent deltas', () => {
		const resource = createResourceV2Definition({
			bounds: { lowerBound: 0, upperBound: 20 },
		});
		const registry = loadResourceV2Registry({
			resources: [resource],
		});
		const engine = createTestEngine();
		const state = initializePlayerResourceV2State(
			engine.activePlayer,
			registry,
		);
		state.amounts[resource.id] = 10;

		const addEffect = {
			type: 'resource',
			method: 'add',
			params: { id: resource.id, percent: 25 },
			round: 'up' as const,
			meta: {
				reconciliation: 'clamp',
				usesPercent: true,
			},
		};
		EFFECTS.get('resource:add')(addEffect, engine, 1);

		expect(state.amounts[resource.id]).toBe(13);
		expect(state.recentDeltas[resource.id]).toBe(3);
		expect(state.touched[resource.id]).toBe(true);
		expect(state.hookSuppressions[resource.id]).toBe(false);

		state.recentDeltas[resource.id] = 0;

		const removeEffect = {
			type: 'resource',
			method: 'remove',
			params: { id: resource.id, percent: 25 },
			round: 'down' as const,
			meta: {
				reconciliation: 'clamp',
				usesPercent: true,
			},
		};
		EFFECTS.get('resource:remove')(removeEffect, engine, 1);

		expect(state.amounts[resource.id]).toBe(10);
		expect(state.recentDeltas[resource.id]).toBe(-3);
	});

	it('clamps values to bounds when applying integer deltas', () => {
		const resource = createResourceV2Definition({
			bounds: { lowerBound: 0, upperBound: 12 },
		});
		const registry = loadResourceV2Registry({
			resources: [resource],
		});
		const engine = createTestEngine();
		const state = initializePlayerResourceV2State(
			engine.activePlayer,
			registry,
		);
		state.amounts[resource.id] = 11;

		const addEffect = {
			type: 'resource',
			method: 'add',
			params: { id: resource.id, amount: 5 },
			meta: { reconciliation: 'clamp' },
		};
		EFFECTS.get('resource:add')(addEffect, engine, 1);

		expect(state.amounts[resource.id]).toBe(12);
		expect(state.recentDeltas[resource.id]).toBe(1);

		const removeEffect = {
			type: 'resource',
			method: 'remove',
			params: { id: resource.id, amount: 9 },
			meta: { reconciliation: 'clamp' },
		};
		EFFECTS.get('resource:remove')(removeEffect, engine, 1);

		expect(state.amounts[resource.id]).toBe(3);
		expect(state.recentDeltas[resource.id]).toBe(-8);
	});

	it('tracks hook suppression flags when requested', () => {
		const resource = createResourceV2Definition({
			bounds: { lowerBound: 0, upperBound: 15 },
		});
		const registry = loadResourceV2Registry({
			resources: [resource],
		});
		const engine = createTestEngine();
		const state = initializePlayerResourceV2State(
			engine.activePlayer,
			registry,
		);
		state.amounts[resource.id] = 5;

		const suppressingEffect = {
			type: 'resource',
			method: 'add',
			params: { id: resource.id, amount: 4 },
			meta: {
				reconciliation: 'clamp',
				suppressHooks: { reason: 'Avoid recursive gain triggers in tests.' },
			},
		};
		EFFECTS.get('resource:add')(suppressingEffect, engine, 1);

		expect(state.amounts[resource.id]).toBe(9);
		expect(state.hookSuppressions[resource.id]).toBe(true);

		const normalEffect = {
			type: 'resource',
			method: 'remove',
			params: { id: resource.id, amount: 2 },
			meta: { reconciliation: 'clamp' },
		};
		EFFECTS.get('resource:remove')(normalEffect, engine, 1);

		expect(state.amounts[resource.id]).toBe(7);
		expect(state.hookSuppressions[resource.id]).toBe(false);
	});
});
