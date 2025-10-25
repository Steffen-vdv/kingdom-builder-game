import { describe, it, beforeEach, expect, vi } from 'vitest';
import { PlayerState } from '../../src/state/index.ts';
import type { EngineContext } from '../../src/context.ts';
import {
	createRuntimeResourceCatalog,
	initialisePlayerResourceState,
	setResourceValue,
	recalculateGroupParentValue,
	increaseResourceLowerBound,
	increaseResourceUpperBound,
} from '../../src/resource-v2/index.ts';
import {
	resourceV2Definition,
	resourceV2GroupDefinition,
	createResourceV2Registries,
} from '@kingdom-builder/testing/factories/resourceV2';

vi.mock('@kingdom-builder/contents/happinessHelpers', () => ({
	happinessTierId: (slug: string) => `mock-happiness-tier:${slug}`,
	happinessPassiveId: (slug: string) => `mock-happiness-passive:${slug}`,
	happinessModifierId: (slug: string, kind: string) =>
		`mock-happiness:${slug}:${kind}`,
	incomeModifier: () => ({ type: 'mock-income' }),
	actionDiscountModifier: () => ({ type: 'mock-discount' }),
	growthBonusEffect: (amount: number) => ({ type: 'mock-growth', amount }),
	createTierPassiveEffect: () => ({ type: 'mock-tier-passive' }),
}));

vi.mock('@kingdom-builder/contents/resources', () => ({
	Resource: {},
	RESOURCES: {},
	getResourceV2Id: (key: string) => key,
}));

vi.mock('@kingdom-builder/contents/stats', () => ({
	Stat: {},
	STATS: {},
	getStatResourceV2Id: (key: string) => key,
}));

const RESOURCE_TIER_TRACK = {
	metadata: {
		id: 'track:resource',
		label: 'Resource Track',
	},
	tiers: [
		{ id: 'tier:resource-low', label: 'Low', threshold: { max: 3 } },
		{
			id: 'tier:resource-mid',
			label: 'Mid',
			threshold: { min: 4, max: 7 },
		},
		{ id: 'tier:resource-high', label: 'High', threshold: { min: 8 } },
	],
} as const;

const PARENT_TIER_TRACK = {
	metadata: {
		id: 'track:parent',
		label: 'Parent Track',
	},
	tiers: [
		{ id: 'tier:parent-low', label: 'Low', threshold: { max: 3 } },
		{
			id: 'tier:parent-mid',
			label: 'Mid',
			threshold: { min: 4, max: 7 },
		},
		{ id: 'tier:parent-high', label: 'High', threshold: { min: 8 } },
	],
} as const;

const groupWithParent = resourceV2GroupDefinition({
	id: 'group:resource-with-parent',
	parent: {
		lowerBound: 0,
		tierTrack: PARENT_TIER_TRACK,
	},
});

const groupWithoutParent = resourceV2GroupDefinition({
	id: 'group:resource-without-parent',
});

const resourceA = resourceV2Definition({
	id: 'resource:a',
	metadata: {
		group: { id: groupWithParent.id },
	},
	bounds: { lowerBound: 0 },
	tierTrack: RESOURCE_TIER_TRACK,
});

const resourceB = resourceV2Definition({
	id: 'resource:b',
	metadata: {
		group: { id: groupWithParent.id },
	},
	bounds: { lowerBound: 0, upperBound: 4 },
	tierTrack: RESOURCE_TIER_TRACK,
});

const registries = createResourceV2Registries({
	resources: [resourceA, resourceB],
	groups: [groupWithParent, groupWithoutParent],
});

const catalog = createRuntimeResourceCatalog(registries);

const RESOURCE_A_ID = resourceA.id;
const RESOURCE_B_ID = resourceB.id;
const PARENT_ID = groupWithParent.parent!.id;
const GROUP_ID = groupWithParent.id;
const NO_PARENT_GROUP_ID = groupWithoutParent.id;

describe('ResourceV2 state', () => {
	let player: PlayerState;
	let context: EngineContext;

	beforeEach(() => {
		player = new PlayerState('A', 'Tester');
		context = { recentResourceGains: [] } as unknown as EngineContext;
	});

	it('initialises player records and parent aggregates', () => {
		player.resourceValues[RESOURCE_A_ID] = 99;
		player.resourceLowerBounds[RESOURCE_A_ID] = 1;
		player.resourceUpperBounds[RESOURCE_A_ID] = 1;
		player.resourceTouched[RESOURCE_A_ID] = true;
		player.resourceTierIds[RESOURCE_A_ID] = 'stale-tier';
		player.resourceBoundTouched[RESOURCE_A_ID] = { lower: true, upper: true };

		initialisePlayerResourceState(player, catalog);

		expect(player.resourceValues[RESOURCE_A_ID]).toBe(0);
		expect(player.resourceLowerBounds[RESOURCE_A_ID]).toBe(0);
		expect(player.resourceUpperBounds[RESOURCE_A_ID]).toBeNull();
		expect(player.resourceTouched[RESOURCE_A_ID]).toBe(false);
		expect(player.resourceTierIds[RESOURCE_A_ID]).toBe('tier:resource-low');
		expect(player.resourceBoundTouched[RESOURCE_A_ID]).toEqual({
			lower: false,
			upper: false,
		});
		expect(player.resourceValues[PARENT_ID]).toBe(0);
		expect(player.resourceTierIds[PARENT_ID]).toBe('tier:parent-low');
	});

	it('writes resource values, recalculates tiers, and logs recent gains', () => {
		initialisePlayerResourceState(player, catalog);

		const nextValue = setResourceValue(
			context,
			player,
			catalog,
			RESOURCE_A_ID,
			8,
		);
		expect(nextValue).toBe(8);
		expect(player.resourceValues[RESOURCE_A_ID]).toBe(8);
		expect(player.resourceTouched[RESOURCE_A_ID]).toBe(true);
		expect(player.resourceTierIds[RESOURCE_A_ID]).toBe('tier:resource-high');
		expect(context.recentResourceGains).toEqual([
			{ key: RESOURCE_A_ID, amount: 8 },
		]);
		expect(player.resourceValues[PARENT_ID]).toBe(8);
		expect(player.resourceTouched[PARENT_ID]).toBe(true);
		expect(player.resourceTierIds[PARENT_ID]).toBe('tier:parent-high');

		const repeat = setResourceValue(context, player, catalog, RESOURCE_A_ID, 8);
		expect(repeat).toBe(8);
		expect(context.recentResourceGains).toHaveLength(1);
	});

	it('recalculates parent values on demand', () => {
		initialisePlayerResourceState(player, catalog);
		setResourceValue(context, player, catalog, RESOURCE_A_ID, 3);
		setResourceValue(context, player, catalog, RESOURCE_B_ID, 2);

		const result = recalculateGroupParentValue(
			context,
			player,
			catalog,
			GROUP_ID,
		);

		expect(result).toBe(5);
		expect(player.resourceValues[PARENT_ID]).toBe(5);
		expect(player.resourceTouched[PARENT_ID]).toBe(true);
	});

	it('returns null when recalculating a group without a parent', () => {
		initialisePlayerResourceState(player, catalog);
		const result = recalculateGroupParentValue(
			context,
			player,
			catalog,
			NO_PARENT_GROUP_ID,
		);
		expect(result).toBeNull();
	});

	it('clamps when raising lower bounds and records bound flags', () => {
		initialisePlayerResourceState(player, catalog);
		setResourceValue(context, player, catalog, RESOURCE_A_ID, 2);

		const outcome = increaseResourceLowerBound(
			context,
			player,
			catalog,
			RESOURCE_A_ID,
			5,
		);

		expect(outcome).toEqual({
			previousBound: 0,
			nextBound: 5,
			valueClamped: true,
		});
		expect(player.resourceLowerBounds[RESOURCE_A_ID]).toBe(5);
		expect(player.resourceValues[RESOURCE_A_ID]).toBe(5);
		expect(player.resourceBoundTouched[RESOURCE_A_ID]).toEqual({
			lower: true,
			upper: false,
		});
	});

	it('clamps when introducing an upper bound', () => {
		initialisePlayerResourceState(player, catalog);
		setResourceValue(context, player, catalog, RESOURCE_A_ID, 9);

		const outcome = increaseResourceUpperBound(
			context,
			player,
			catalog,
			RESOURCE_A_ID,
			5,
		);

		expect(outcome).toEqual({
			previousBound: null,
			nextBound: 5,
			valueClamped: true,
		});
		expect(player.resourceUpperBounds[RESOURCE_A_ID]).toBe(5);
		expect(player.resourceValues[RESOURCE_A_ID]).toBe(5);
		expect(player.resourceBoundTouched[RESOURCE_A_ID]).toEqual({
			lower: false,
			upper: true,
		});
	});

	it('prevents parent lower bounds from exceeding child aggregates', () => {
		initialisePlayerResourceState(player, catalog);
		expect(() =>
			increaseResourceLowerBound(context, player, catalog, PARENT_ID, 3),
		).toThrowError(
			`ResourceV2 parent "${PARENT_ID}" cannot raise lower bound beyond its aggregated child total of 0.`,
		);
	});

	it('refreshes parent aggregates when raising the upper bound', () => {
		initialisePlayerResourceState(player, catalog);
		increaseResourceUpperBound(context, player, catalog, PARENT_ID, 5);
		setResourceValue(context, player, catalog, RESOURCE_A_ID, 4);
		setResourceValue(context, player, catalog, RESOURCE_B_ID, 4);
		const previousLogEntries = context.recentResourceGains.length;

		const outcome = increaseResourceUpperBound(
			context,
			player,
			catalog,
			PARENT_ID,
			3,
		);

		expect(outcome).toEqual({
			previousBound: 5,
			nextBound: 8,
			valueClamped: false,
		});
		expect(player.resourceUpperBounds[PARENT_ID]).toBe(8);
		expect(player.resourceValues[PARENT_ID]).toBe(8);
		expect(context.recentResourceGains).toHaveLength(previousLogEntries);
	});

	it('rejects updates for unknown resources', () => {
		initialisePlayerResourceState(player, catalog);
		expect(() =>
			setResourceValue(context, player, catalog, 'unknown', 1),
		).toThrowError('ResourceV2 state does not recognise resource "unknown".');
	});
});
