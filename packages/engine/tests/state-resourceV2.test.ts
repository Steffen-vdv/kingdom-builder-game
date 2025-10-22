import { beforeEach, describe, expect, it } from 'vitest';
import { createContentFactory } from '@kingdom-builder/testing';
import {
	PlayerState,
	getResourceV2Bounds,
	getResourceV2RecentGains,
	getResourceV2TouchedMap,
	getResourceV2ValueMap,
	setResourceV2Bounds,
	setResourceV2Keys,
	setResourceV2Value,
} from '../src/state/index.ts';
import { hydrateResourceV2Metadata } from '../src/resourcesV2/index.ts';
import { cloneEngineContext } from '../src/actions/context_clone.ts';
import { createTestEngine } from './helpers.ts';

describe('ResourceV2 state management', () => {
	let sampleResourceId: string;

	beforeEach(() => {
		const factory = createContentFactory();
		const resource = factory.resourceV2({
			id: 'resourceV2:test',
			name: 'Test Resource',
			order: 99,
			lowerBound: -5,
			upperBound: 10,
		});
		const catalog = hydrateResourceV2Metadata(
			factory.resourcesV2,
			factory.resourceGroups,
		);
		setResourceV2Keys(catalog);
		sampleResourceId = resource.id;
	});

	it('initializes ResourceV2 values, bounds, touched flags, and recent gains', () => {
		const player = new PlayerState('A', 'Tester');
		const values = getResourceV2ValueMap(player);
		expect(values[sampleResourceId]).toBe(0);
		const bounds = getResourceV2Bounds(player);
		expect(bounds[sampleResourceId]).toEqual({
			lower: -5,
			upper: 10,
		});
		const touched = getResourceV2TouchedMap(player);
		expect(touched[sampleResourceId]).toBe(false);
		expect(getResourceV2RecentGains(player)).toEqual([]);
	});

	it('marks resources as touched when values become non-zero', () => {
		const player = new PlayerState('A', 'Tester');
		setResourceV2Value(player, sampleResourceId, 3);
		const afterIncrease = getResourceV2TouchedMap(player);
		expect(afterIncrease[sampleResourceId]).toBe(true);
		setResourceV2Value(player, sampleResourceId, 0);
		const touched = getResourceV2TouchedMap(player);
		expect(touched[sampleResourceId]).toBe(true);
	});

	it('clones ResourceV2 state when duplicating engine contexts', () => {
		const engine = createTestEngine();
		const player = engine.game.active;
		setResourceV2Value(player, sampleResourceId, 4);
		setResourceV2Bounds(player, sampleResourceId, -1, 12);
		player.resourceV2.recentGains.push({
			key: sampleResourceId,
			amount: 4,
		});
		engine.recentResourceV2Gains.push({
			key: sampleResourceId,
			amount: 4,
		});

		const cloned = cloneEngineContext(engine);
		const clonedPlayer = cloned.game.active;

		const clonedValues = getResourceV2ValueMap(clonedPlayer);
		expect(clonedValues[sampleResourceId]).toBe(4);
		const clonedBounds = getResourceV2Bounds(clonedPlayer);
		expect(clonedBounds[sampleResourceId]).toEqual({
			lower: -1,
			upper: 12,
		});
		const clonedTouched = getResourceV2TouchedMap(clonedPlayer);
		expect(clonedTouched[sampleResourceId]).toBe(true);
		expect(getResourceV2RecentGains(clonedPlayer)).toEqual([
			{ key: sampleResourceId, amount: 4 },
		]);
		expect(cloned.recentResourceV2Gains).toEqual([
			{ key: sampleResourceId, amount: 4 },
		]);
		const originalRecentGains = player.resourceV2.recentGains;
		const clonedRecentGains = clonedPlayer.resourceV2.recentGains;
		expect(clonedRecentGains).not.toBe(originalRecentGains);
	});
});
