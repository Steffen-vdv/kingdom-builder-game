import { beforeEach, describe, expect, it } from 'vitest';
import { createContentFactory } from '@kingdom-builder/testing';
import { hydrateResourceV2Metadata } from '../src/resourcesV2/index.ts';
import {
	PlayerState,
	clearResourceV2RecentGains,
	getResourceV2Keys,
	getResourceV2ParentId,
	getResourceV2ParentKeys,
	getResourceV2ParentLowerBound,
	getResourceV2ParentUpperBound,
	getResourceV2ParentValue,
	getResourceV2LowerBound,
	getResourceV2UpperBound,
	getResourceV2Value,
	logResourceV2RecentGain,
	markResourceV2BoundTouched,
	markResourceV2ParentBoundTouched,
	markResourceV2ParentTouched,
	markResourceV2Touched,
	setResourceV2Keys,
	setResourceV2LowerBound,
	setResourceV2ParentLowerBound,
	setResourceV2ParentUpperBound,
	setResourceV2ParentValue,
	setResourceV2UpperBound,
	setResourceV2Value,
} from '../src/state/index.ts';
import { cloneEngineContext } from '../src/actions/context_clone.ts';
import { createTestEngine } from './helpers.ts';

describe('ResourceV2 player state scaffolding', () => {
	const content = createContentFactory();
	const catalog = hydrateResourceV2Metadata(
		content.resourcesV2,
		content.resourceGroups,
	);

	beforeEach(() => {
		setResourceV2Keys(catalog);
	});

	it('initializes values, bounds, and touched flags for resources and parents', () => {
		const player = new PlayerState('A', 'Alice');
		const resourceKeys = getResourceV2Keys();
		expect(resourceKeys.length).toBeGreaterThan(0);

		for (const key of resourceKeys) {
			expect(getResourceV2Value(player, key)).toBe(0);
			expect(getResourceV2LowerBound(player, key)).toBe(
				catalog.resourcesById[key]?.lowerBound,
			);
			expect(getResourceV2UpperBound(player, key)).toBe(
				catalog.resourcesById[key]?.upperBound,
			);
			expect(player.resourceV2Touched[key]).toBe(false);
			expect(player.resourceV2BoundTouched[key]).toBe(false);
		}

		expect(player.resourceV2RecentGains).toEqual([]);

		const parentKeys = getResourceV2ParentKeys();
		for (const parentId of parentKeys) {
			expect(getResourceV2ParentValue(player, parentId)).toBe(0);
			expect(getResourceV2ParentLowerBound(player, parentId)).toBe(
				catalog.parentsById[parentId]?.lowerBound,
			);
			expect(getResourceV2ParentUpperBound(player, parentId)).toBe(
				catalog.parentsById[parentId]?.upperBound,
			);
			expect(player.resourceV2ParentTouched[parentId]).toBe(false);
			expect(player.resourceV2ParentBoundTouched[parentId]).toBe(false);
		}
	});

	it('clones ResourceV2 values, bounds, and logs when engine context is cloned', () => {
		const engine = createTestEngine();
		const player = engine.game.players[0]!;
		const resourceKeys = getResourceV2Keys();
		const primary = resourceKeys[0]!;

		setResourceV2Value(player, primary, 12);
		setResourceV2LowerBound(player, primary, 3);
		setResourceV2UpperBound(player, primary, 20);
		markResourceV2Touched(player, primary);
		markResourceV2BoundTouched(player, primary);
		logResourceV2RecentGain(player, { key: primary, amount: 5 });

		const parentId = getResourceV2ParentId(primary);
		if (parentId) {
			setResourceV2ParentValue(player, parentId, 40);
			setResourceV2ParentLowerBound(player, parentId, 10);
			setResourceV2ParentUpperBound(player, parentId, 120);
			markResourceV2ParentTouched(player, parentId);
			markResourceV2ParentBoundTouched(player, parentId);
		}

		const cloned = cloneEngineContext(engine);
		const clonedPlayer = cloned.game.players[0]!;

		expect(getResourceV2Value(clonedPlayer, primary)).toBe(12);
		expect(getResourceV2LowerBound(clonedPlayer, primary)).toBe(3);
		expect(getResourceV2UpperBound(clonedPlayer, primary)).toBe(20);
		expect(clonedPlayer.resourceV2Touched[primary]).toBe(true);
		expect(clonedPlayer.resourceV2BoundTouched[primary]).toBe(true);
		expect(clonedPlayer.resourceV2RecentGains).toEqual([
			{ key: primary, amount: 5 },
		]);
		expect(clonedPlayer.resourceV2RecentGains).not.toBe(
			player.resourceV2RecentGains,
		);

		if (parentId) {
			expect(getResourceV2ParentValue(clonedPlayer, parentId)).toBe(40);
			expect(getResourceV2ParentLowerBound(clonedPlayer, parentId)).toBe(10);
			expect(getResourceV2ParentUpperBound(clonedPlayer, parentId)).toBe(120);
			expect(clonedPlayer.resourceV2ParentTouched[parentId]).toBe(true);
			expect(clonedPlayer.resourceV2ParentBoundTouched[parentId]).toBe(true);
		}

		setResourceV2Value(clonedPlayer, primary, 99);
		expect(getResourceV2Value(player, primary)).toBe(12);
		clonedPlayer.resourceV2RecentGains.push({ key: primary, amount: 1 });
		expect(player.resourceV2RecentGains).toHaveLength(1);

		if (parentId) {
			setResourceV2ParentValue(clonedPlayer, parentId, 1);
			expect(getResourceV2ParentValue(player, parentId)).toBe(40);
		}
	});

	it('tracks touched flags and recent gain logs via helpers', () => {
		const player = new PlayerState('A', 'Alice');
		const resourceKey = getResourceV2Keys()[0]!;
		expect(player.resourceV2Touched[resourceKey]).toBe(false);
		markResourceV2Touched(player, resourceKey);
		expect(player.resourceV2Touched[resourceKey]).toBe(true);
		expect(player.resourceV2BoundTouched[resourceKey]).toBe(false);
		markResourceV2BoundTouched(player, resourceKey);
		expect(player.resourceV2BoundTouched[resourceKey]).toBe(true);

		logResourceV2RecentGain(player, { key: resourceKey, amount: -2 });
		expect(player.resourceV2RecentGains).toEqual([
			{ key: resourceKey, amount: -2 },
		]);
		clearResourceV2RecentGains(player);
		expect(player.resourceV2RecentGains).toEqual([]);

		const parentId = getResourceV2ParentId(resourceKey);
		if (parentId) {
			expect(player.resourceV2ParentTouched[parentId]).toBe(false);
			markResourceV2ParentTouched(player, parentId);
			expect(player.resourceV2ParentTouched[parentId]).toBe(true);
			expect(player.resourceV2ParentBoundTouched[parentId]).toBe(false);
			markResourceV2ParentBoundTouched(player, parentId);
			expect(player.resourceV2ParentBoundTouched[parentId]).toBe(true);
		}
	});
});
