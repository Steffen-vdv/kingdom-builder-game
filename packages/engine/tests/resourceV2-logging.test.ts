import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createContentFactory } from '@kingdom-builder/testing';
import type { EffectDef } from '@kingdom-builder/protocol';
import { hydrateResourceV2Metadata } from '../src/resourcesV2/index.ts';
import { setResourceV2Keys } from '../src/state/index.ts';
import { runEffects } from '../src/index.ts';
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
	engine.recentResourceGains = [];
	return { engine, resourceId: resource.id };
};

describe('ResourceV2 logging', () => {
	beforeEach(resetResourceV2Registry);
	afterEach(resetResourceV2Registry);

	it('records signed deltas and emits hooks for ResourceV2 effects', () => {
		const { engine, resourceId } = createEngineWithResource();
		const gain = vi.fn();
		const loss = vi.fn();
		const removeGainHook = engine.services.resourceV2.onGain(gain);
		const removeLossHook = engine.services.resourceV2.onLoss(loss);

		const addEffect: EffectDef = {
			type: 'resource_v2',
			method: 'add',
			params: {
				resourceId,
				amount: 5,
			},
		};

		engine.recentResourceGains = [];
		engine.activePlayer.setResourceV2Value(resourceId, 2);
		runEffects([addEffect], engine);

		expect(engine.recentResourceGains).toContainEqual({
			key: resourceId,
			amount: 5,
			source: 'resourceV2',
		});
		expect(gain).toHaveBeenCalledWith(engine, {
			player: engine.activePlayer,
			resourceId,
			amount: 5,
		});

		const removeEffect: EffectDef = {
			type: 'resource_v2',
			method: 'remove',
			params: {
				resourceId,
				amount: 4,
			},
		};

		engine.recentResourceGains = [];
		runEffects([removeEffect], engine);

		expect(engine.recentResourceGains).toContainEqual({
			key: resourceId,
			amount: -4,
			source: 'resourceV2',
		});
		expect(loss).toHaveBeenCalledWith(engine, {
			player: engine.activePlayer,
			resourceId,
			amount: 4,
		});

		removeGainHook();
		removeLossHook();
	});

	it('honors suppressHooks when recording ResourceV2 deltas', () => {
		const { engine, resourceId } = createEngineWithResource();
		const gain = vi.fn();
		const loss = vi.fn();
		engine.services.resourceV2.onGain(gain);
		engine.services.resourceV2.onLoss(loss);

		engine.activePlayer.setResourceV2Value(resourceId, 6);
		engine.recentResourceGains = [];
		const suppressed: EffectDef = {
			type: 'resource_v2',
			method: 'remove',
			params: {
				resourceId,
				amount: 3,
				suppressHooks: true,
			},
		};

		runEffects([suppressed], engine);

		expect(engine.recentResourceGains).toEqual([]);
		expect(gain).not.toHaveBeenCalled();
		expect(loss).not.toHaveBeenCalled();
	});

	it('tracks ResourceV2 transfer history for both players', () => {
		const { engine, resourceId } = createEngineWithResource();
		engine.opponent.setResourceV2Value(resourceId, 8);
		engine.activePlayer.setResourceV2Value(resourceId, 1);
		engine.recentResourceGains = [];
		const transfer: EffectDef = {
			type: 'resource_v2',
			method: 'transfer',
			params: {
				amount: 4,
				from: { resourceId },
				to: { resourceId },
			},
		};

		runEffects([transfer], engine);

		const history = engine.recentResourceGains.filter(
			(entry) => entry.key === resourceId,
		);
		expect(history).toEqual(
			expect.arrayContaining([
				{
					key: resourceId,
					amount: -4,
					source: 'resourceV2',
				},
				{
					key: resourceId,
					amount: 4,
					source: 'resourceV2',
				},
			]),
		);
	});
});
