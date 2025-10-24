import { describe, expect, it } from 'vitest';
import { createContentFactory } from '@kingdom-builder/testing';
import type { EffectDef } from '@kingdom-builder/protocol';
import { hydrateResourceV2Metadata } from '../src/resourcesV2/index.ts';
import { runEffects } from '../src/effects/index.ts';
import { createTestEngine } from './helpers.ts';

describe('ResourceV2 logging integration', () => {
	const setupEngine = () => {
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

	it('records signed ResourceV2 deltas in recentResourceGains', () => {
		const { engine, resourceId } = setupEngine();
		engine.recentResourceGains = [];

		const gainEffect: EffectDef = {
			type: 'resource_v2',
			method: 'add',
			params: { resourceId, amount: 6 },
		};

		runEffects([gainEffect], engine);

		expect(engine.recentResourceGains).toContainEqual({
			key: resourceId,
			amount: 6,
		});

		engine.recentResourceGains = [];
		engine.activePlayer.setResourceV2Value(resourceId, 6);

		const lossEffect: EffectDef = {
			type: 'resource_v2',
			method: 'remove',
			params: { resourceId, amount: 4 },
		};

		runEffects([lossEffect], engine);

		expect(engine.recentResourceGains).toContainEqual({
			key: resourceId,
			amount: -4,
		});
	});

	it('skips logging when ResourceV2 effects suppress hooks', () => {
		const { engine, resourceId } = setupEngine();
		engine.recentResourceGains = [];
		engine.activePlayer.setResourceV2Value(resourceId, 3);

		const suppressedEffect: EffectDef = {
			type: 'resource_v2',
			method: 'add',
			params: { resourceId, amount: 5, suppressHooks: true },
		};

		runEffects([suppressedEffect], engine);

		expect(engine.recentResourceGains).toEqual([]);
		expect(engine.activePlayer.resourceV2.recentGains).toEqual([]);
	});

	it('tracks ResourceV2 gain history with signed entries', () => {
		const { engine, resourceId } = setupEngine();
		const service = engine.services.resourceV2;
		const player = engine.activePlayer;

		player.resetRecentResourceV2Gains();

		service.addValue(engine, player, { resourceId, amount: 5 });
		service.removeValue(engine, player, { resourceId, amount: 2 });
		service.addValue(engine, player, {
			resourceId,
			amount: 3,
			suppressHooks: true,
		});

		expect(player.resourceV2.recentGains).toEqual(
			expect.arrayContaining([
				{ key: resourceId, amount: 5 },
				{ key: resourceId, amount: -2 },
			]),
		);
		expect(
			player.resourceV2.recentGains.some(
				(entry) => entry.key === resourceId && entry.amount === 3,
			),
		).toBe(false);
	});
});
