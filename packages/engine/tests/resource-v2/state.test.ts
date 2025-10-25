import { describe, it, beforeEach, expect } from 'vitest';
import { PlayerState } from '../../src/state/index.ts';
import type { EngineContext } from '../../src/context.ts';
import {
	initialisePlayerResourceState,
	setResourceValue,
	recalculateGroupParentValue,
	increaseResourceLowerBound,
	increaseResourceUpperBound,
} from '../../src/resource-v2/state.ts';
import { createRuntimeResourceCatalog } from '../../src/resource-v2/index.ts';
import {
	createResourceV2Registries,
	resourceV2Definition,
	resourceV2GroupDefinition,
} from '@kingdom-builder/testing';

const RESOURCE_A_ID = 'resource:alpha';
const RESOURCE_B_ID = 'resource:beta';
const GROUP_WITH_PARENT_ID = 'group:alpha';
const GROUP_WITHOUT_PARENT_ID = 'group:orphan';
const PARENT_RESOURCE_ID = 'resource:alpha:parent';

const resourceTierTrack = {
	metadata: {
		id: 'track:resource-alpha',
		label: 'Alpha Progression',
	},
	tiers: [
		{ id: 'tier:alpha-low', label: 'Low', threshold: { max: 3 } },
		{
			id: 'tier:alpha-mid',
			label: 'Mid',
			threshold: { min: 4, max: 7 },
		},
		{ id: 'tier:alpha-high', label: 'High', threshold: { min: 8 } },
	],
} as const;

const parentTierTrack = {
	metadata: {
		id: 'track:parent-alpha',
		label: 'Parent Aggregate',
	},
	tiers: [
		{ id: 'tier:parent-low', label: 'Low', threshold: { max: 3 } },
		{
			id: 'tier:parent-mid',
			label: 'Mid',
			threshold: { min: 4, max: 7 },
		},
		{
			id: 'tier:parent-high',
			label: 'High',
			threshold: { min: 8 },
		},
	],
} as const;

const resourceADefinition = resourceV2Definition({
	id: RESOURCE_A_ID,
	metadata: {
		group: { id: GROUP_WITH_PARENT_ID },
	},
	bounds: { lowerBound: 0 },
	tierTrack: resourceTierTrack,
});

const resourceBDefinition = resourceV2Definition({
	id: RESOURCE_B_ID,
	metadata: {
		group: { id: GROUP_WITH_PARENT_ID },
	},
	bounds: { lowerBound: 0, upperBound: 4 },
	tierTrack: resourceTierTrack,
});

const groupWithParentDefinition = resourceV2GroupDefinition({
	id: GROUP_WITH_PARENT_ID,
	parent: {
		id: PARENT_RESOURCE_ID,
		lowerBound: 0,
		tierTrack: parentTierTrack,
	},
});

const groupWithoutParentDefinition = resourceV2GroupDefinition({
	id: GROUP_WITHOUT_PARENT_ID,
});

const catalog = createRuntimeResourceCatalog(
	createResourceV2Registries({
		resources: [resourceADefinition, resourceBDefinition],
		groups: [groupWithParentDefinition, groupWithoutParentDefinition],
	}),
);

const resourceLowTierId = resourceTierTrack.tiers[0]!.id;
const resourceHighTierId = resourceTierTrack.tiers.at(-1)!.id;
const parentLowTierId = parentTierTrack.tiers[0]!.id;
const parentHighTierId = parentTierTrack.tiers.at(-1)!.id;

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
		expect(player.resourceTierIds[RESOURCE_A_ID]).toBe(resourceLowTierId);
		expect(player.resourceBoundTouched[RESOURCE_A_ID]).toEqual({
			lower: false,
			upper: false,
		});
		expect(player.resourceValues[PARENT_RESOURCE_ID]).toBe(0);
		expect(player.resourceTierIds[PARENT_RESOURCE_ID]).toBe(parentLowTierId);
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
		expect(player.resourceTierIds[RESOURCE_A_ID]).toBe(resourceHighTierId);
		expect(context.recentResourceGains).toEqual([
			{ key: RESOURCE_A_ID, amount: 8 },
		]);
		expect(player.resourceValues[PARENT_RESOURCE_ID]).toBe(8);
		expect(player.resourceTouched[PARENT_RESOURCE_ID]).toBe(true);
		expect(player.resourceTierIds[PARENT_RESOURCE_ID]).toBe(parentHighTierId);

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
			GROUP_WITH_PARENT_ID,
		);

		expect(result).toBe(5);
		expect(player.resourceValues[PARENT_RESOURCE_ID]).toBe(5);
		expect(player.resourceTouched[PARENT_RESOURCE_ID]).toBe(true);
	});

	it('returns null when recalculating a group without a parent', () => {
		initialisePlayerResourceState(player, catalog);
		const result = recalculateGroupParentValue(
			context,
			player,
			catalog,
			GROUP_WITHOUT_PARENT_ID,
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
			increaseResourceLowerBound(
				context,
				player,
				catalog,
				PARENT_RESOURCE_ID,
				3,
			),
		).toThrowError(
			'ResourceV2 parent "resource:alpha:parent" cannot raise lower bound beyond its aggregated child total of 0.',
		);
	});

	it('refreshes parent aggregates when raising the upper bound', () => {
		initialisePlayerResourceState(player, catalog);
		increaseResourceUpperBound(context, player, catalog, PARENT_RESOURCE_ID, 5);
		setResourceValue(context, player, catalog, RESOURCE_A_ID, 4);
		setResourceValue(context, player, catalog, RESOURCE_B_ID, 4);
		const previousLogEntries = context.recentResourceGains.length;

		const outcome = increaseResourceUpperBound(
			context,
			player,
			catalog,
			PARENT_RESOURCE_ID,
			3,
		);

		expect(outcome).toEqual({
			previousBound: 5,
			nextBound: 8,
			valueClamped: false,
		});
		expect(player.resourceUpperBounds[PARENT_RESOURCE_ID]).toBe(8);
		expect(player.resourceValues[PARENT_RESOURCE_ID]).toBe(8);
		expect(context.recentResourceGains).toHaveLength(previousLogEntries);
	});

	it('rejects updates for unknown resources', () => {
		initialisePlayerResourceState(player, catalog);
		expect(() =>
			setResourceValue(context, player, catalog, 'unknown', 1),
		).toThrowError('ResourceV2 state does not recognise resource "unknown".');
	});
});
