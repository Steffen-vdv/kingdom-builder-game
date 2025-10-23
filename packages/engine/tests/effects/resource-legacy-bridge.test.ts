import { describe, it, expect } from 'vitest';
import { createContentFactory } from '@kingdom-builder/testing';
import type { EffectDef } from '@kingdom-builder/protocol';
import {
	hydrateResourceV2Metadata,
	Resource,
	runEffects,
} from '../../src/index.ts';
import { createTestEngine } from '../helpers.ts';

describe('legacy resource handlers bridging ResourceV2', () => {
	const createEngineWithResourceV2 = () => {
		const factory = createContentFactory();
		const resource = factory.resourceV2({ lowerBound: 0 });
		const catalog = hydrateResourceV2Metadata(
			factory.resourcesV2,
			factory.resourceGroups,
		);
		const engine = createTestEngine({ resourceV2Catalog: catalog });
		engine.game.currentPlayerIndex = 0;
		return { engine, resourceId: resource.id };
	};

	it('routes legacy resource:add effects to the ResourceV2 service', () => {
		const { engine, resourceId } = createEngineWithResourceV2();
		engine.recentResourceGains = [];
		const effect: EffectDef = {
			type: 'resource',
			method: 'add',
			params: { key: resourceId, amount: 4 },
		};

		runEffects([effect], engine);

		expect(engine.activePlayer.getResourceV2Value(resourceId)).toBe(4);
		expect(engine.recentResourceGains).toContainEqual({
			key: resourceId,
			amount: 4,
		});
	});

	it('logs signed deltas when legacy resource:remove targets ResourceV2 values', () => {
		const { engine, resourceId } = createEngineWithResourceV2();
		engine.activePlayer.setResourceV2Value(resourceId, 7);
		engine.recentResourceGains = [];
		const effect: EffectDef = {
			type: 'resource',
			method: 'remove',
			params: { key: resourceId, amount: 10 },
		};

		runEffects([effect], engine);

		expect(engine.activePlayer.getResourceV2Value(resourceId)).toBe(0);
		expect(engine.recentResourceGains).toContainEqual({
			key: resourceId,
			amount: -7,
		});
	});

	it('records negative gains for legacy resource removals', () => {
		const engine = createTestEngine();
		engine.game.currentPlayerIndex = 0;
		engine.activePlayer.gold = 6;
		engine.recentResourceGains = [];
		const effect: EffectDef = {
			type: 'resource',
			method: 'remove',
			params: { key: Resource.gold, amount: 3 },
		};

		runEffects([effect], engine);

		expect(engine.activePlayer.gold).toBe(3);
		expect(engine.recentResourceGains).toContainEqual({
			key: Resource.gold,
			amount: -3,
		});
	});

	it('captures both sides of legacy resource transfers for ResourceV2 definitions', () => {
		const { engine, resourceId } = createEngineWithResourceV2();
		engine.opponent.setResourceV2Value(resourceId, 9);
		engine.activePlayer.setResourceV2Value(resourceId, 1);
		engine.recentResourceGains = [];
		const effect: EffectDef = {
			type: 'resource',
			method: 'transfer',
			params: { key: resourceId, amount: 5 },
		};

		runEffects([effect], engine);

		expect(engine.opponent.getResourceV2Value(resourceId)).toBe(4);
		expect(engine.activePlayer.getResourceV2Value(resourceId)).toBe(6);
		const deltas = engine.recentResourceGains.filter(
			(gain) => gain.key === resourceId,
		);
		expect(deltas).toEqual(
			expect.arrayContaining([
				{ key: resourceId, amount: -5 },
				{ key: resourceId, amount: 5 },
			]),
		);
	});
});
