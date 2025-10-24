import { beforeEach, describe, expect, it } from 'vitest';
import { createContentFactory } from '@kingdom-builder/testing';
import type { EffectDef } from '@kingdom-builder/protocol';
import { hydrateResourceV2Metadata } from '../src/resourcesV2/index.ts';
import { setResourceV2Keys } from '../src/state/index.ts';
import { runEffects } from '../src/effects/index.ts';
import { createTestEngine } from './helpers.ts';

const resetResourceV2Registry = () => {
	setResourceV2Keys();
};

const createEngineWithResource = () => {
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

describe('ResourceV2 logging integration', () => {
	beforeEach(resetResourceV2Registry);

	it('records signed deltas for ResourceV2 adds and removes', () => {
		const { engine, resourceId } = createEngineWithResource();

		engine.recentResourceGains = [];
		const addEffect: EffectDef = {
			type: 'resource_v2',
			method: 'add',
			params: { resourceId, amount: 3 },
		};

		runEffects([addEffect], engine);

		expect(engine.recentResourceGains).toContainEqual({
			key: resourceId,
			amount: 3,
		});

		engine.recentResourceGains = [];
		engine.activePlayer.setResourceV2Value(resourceId, 5);
		const removeEffect: EffectDef = {
			type: 'resource_v2',
			method: 'remove',
			params: { resourceId, amount: 7 },
		};

		runEffects([removeEffect], engine);

		expect(engine.recentResourceGains).toContainEqual({
			key: resourceId,
			amount: -5,
		});
	});

	it('skips logging when suppressHooks is enabled', () => {
		const { engine, resourceId } = createEngineWithResource();

		engine.activePlayer.setResourceV2Value(resourceId, 9);
		engine.recentResourceGains = [];
		const effect: EffectDef = {
			type: 'resource_v2',
			method: 'remove',
			params: { resourceId, amount: 4, suppressHooks: true },
		};

		runEffects([effect], engine);

		expect(engine.recentResourceGains).toEqual([]);
		expect(engine.activePlayer.getResourceV2Value(resourceId)).toBe(5);
	});

	it('tracks transfer history for both donor and recipient', () => {
		const { engine, resourceId } = createEngineWithResource();

		engine.opponent.setResourceV2Value(resourceId, 8);
		engine.activePlayer.setResourceV2Value(resourceId, 2);
		engine.recentResourceGains = [];
		const effect: EffectDef = {
			type: 'resource_v2',
			method: 'transfer',
			params: {
				amount: 4,
				from: { resourceId, reconciliation: 'clamp' },
				to: { resourceId, reconciliation: 'clamp' },
				donor: 'opponent',
				recipient: 'active',
			},
		};

		runEffects([effect], engine);

		expect(engine.recentResourceGains).toEqual([
			{ key: resourceId, amount: -4 },
			{ key: resourceId, amount: 4 },
		]);
	});
});
