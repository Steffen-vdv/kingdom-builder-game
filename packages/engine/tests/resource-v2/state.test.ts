import { describe, it, beforeEach, expect } from 'vitest';
import {
	resourceV2Definition,
	resourceV2GroupDefinition,
	createResourceV2Registries,
} from '@kingdom-builder/testing';
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

const RESOURCE_A = 'resource-a';
const RESOURCE_B = 'resource-b';
const PARENT_ID = 'resource-parent';
const GROUP_ID = 'resource-group';
const NO_PARENT_GROUP_ID = 'no-parent-group';
const RESOURCE_A_TRACK_ID = `${RESOURCE_A}-track`;
const RESOURCE_B_TRACK_ID = `${RESOURCE_B}-track`;
const PARENT_TRACK_ID = `${PARENT_ID}-track`;

function tierThreshold(min: number | null, max: number | null) {
	const threshold: { min?: number; max?: number } = {};
	if (min !== null) {
		threshold.min = min;
	}
	if (max !== null) {
		threshold.max = max;
	}
	return threshold;
}

function createTierTrack(id: string) {
	return {
		metadata: {
			id,
			label: `${id}-label`,
			icon: `${id}-icon`,
			description: `${id}-description`,
		},
		tiers: [
			{
				id: `${id}-low`,
				label: `${id}-low-label`,
				icon: `${id}-low-icon`,
				description: `${id}-low-description`,
				threshold: tierThreshold(null, 3),
			},
			{
				id: `${id}-mid`,
				label: `${id}-mid-label`,
				icon: `${id}-mid-icon`,
				description: `${id}-mid-description`,
				threshold: tierThreshold(4, 7),
			},
			{
				id: `${id}-high`,
				label: `${id}-high-label`,
				icon: `${id}-high-icon`,
				description: `${id}-high-description`,
				threshold: tierThreshold(8, null),
			},
		],
	} as const;
}

function createCatalog() {
	const groupWithParent = resourceV2GroupDefinition({
		id: GROUP_ID,
		parent: {
			id: PARENT_ID,
			lowerBound: 0,
			tierTrack: createTierTrack(PARENT_TRACK_ID),
		},
	});
	const groupWithoutParent = resourceV2GroupDefinition({
		id: NO_PARENT_GROUP_ID,
	});
	const resourceA = resourceV2Definition({
		id: RESOURCE_A,
		metadata: { group: { id: groupWithParent.id } },
		bounds: { lowerBound: 0 },
		tierTrack: createTierTrack(RESOURCE_A_TRACK_ID),
	});
	const resourceB = resourceV2Definition({
		id: RESOURCE_B,
		metadata: { group: { id: groupWithParent.id } },
		bounds: { lowerBound: 0, upperBound: 4 },
		tierTrack: createTierTrack(RESOURCE_B_TRACK_ID),
	});
	const registries = createResourceV2Registries({
		resources: [resourceA, resourceB],
		groups: [groupWithParent, groupWithoutParent],
	});
	return createRuntimeResourceCatalog(registries);
}

describe('ResourceV2 state', () => {
	let player: PlayerState;
	let context: EngineContext;
	let catalog: ReturnType<typeof createCatalog>;

	beforeEach(() => {
		catalog = createCatalog();
		player = new PlayerState('A', 'Tester');
		context = { recentResourceGains: [] } as unknown as EngineContext;
	});

	it('initialises player records and parent aggregates', () => {
		player.resourceValues[RESOURCE_A] = 99;
		player.resourceLowerBounds[RESOURCE_A] = 1;
		player.resourceUpperBounds[RESOURCE_A] = 1;
		player.resourceTouched[RESOURCE_A] = true;
		player.resourceTierIds[RESOURCE_A] = 'stale-tier';
		player.resourceBoundTouched[RESOURCE_A] = { lower: true, upper: true };

		initialisePlayerResourceState(player, catalog);

		expect(player.resourceValues[RESOURCE_A]).toBe(0);
		expect(player.resourceLowerBounds[RESOURCE_A]).toBe(0);
		expect(player.resourceUpperBounds[RESOURCE_A]).toBeNull();
		expect(player.resourceTouched[RESOURCE_A]).toBe(false);
		expect(player.resourceTierIds[RESOURCE_A]).toBe(
			`${RESOURCE_A_TRACK_ID}-low`,
		);
		expect(player.resourceBoundTouched[RESOURCE_A]).toEqual({
			lower: false,
			upper: false,
		});
		expect(player.resourceValues[PARENT_ID]).toBe(0);
		expect(player.resourceTierIds[PARENT_ID]).toBe(`${PARENT_TRACK_ID}-low`);
	});

	it('writes resource values, recalculates tiers, and logs recent gains', () => {
		initialisePlayerResourceState(player, catalog);

		const nextValue = setResourceValue(context, player, catalog, RESOURCE_A, 8);
		expect(nextValue).toBe(8);
		expect(player.resourceValues[RESOURCE_A]).toBe(8);
		expect(player.resourceTouched[RESOURCE_A]).toBe(true);
		expect(player.resourceTierIds[RESOURCE_A]).toBe(
			`${RESOURCE_A_TRACK_ID}-high`,
		);
		expect(context.recentResourceGains).toEqual([
			{ key: RESOURCE_A, amount: 8 },
		]);
		expect(player.resourceValues[PARENT_ID]).toBe(8);
		expect(player.resourceTouched[PARENT_ID]).toBe(true);
		expect(player.resourceTierIds[PARENT_ID]).toBe(`${PARENT_TRACK_ID}-high`);

		const repeat = setResourceValue(context, player, catalog, RESOURCE_A, 8);
		expect(repeat).toBe(8);
		expect(context.recentResourceGains).toHaveLength(1);
	});

	it('respects suppression options for tier updates and logging', () => {
		initialisePlayerResourceState(player, catalog);
		context.recentResourceGains.length = 0;

		const result = setResourceValue(context, player, catalog, RESOURCE_A, 6, {
			suppressTouched: true,
			suppressRecentEntry: true,
			skipTierUpdate: true,
		});

		expect(result).toBe(6);
		expect(player.resourceTouched[RESOURCE_A]).toBe(false);
		expect(player.resourceTierIds[RESOURCE_A]).toBe(
			`${RESOURCE_A_TRACK_ID}-low`,
		);
		expect(context.recentResourceGains).toHaveLength(0);
		expect(player.resourceValues[PARENT_ID]).toBe(6);
		expect(player.resourceTouched[PARENT_ID]).toBe(false);
		expect(player.resourceTierIds[PARENT_ID]).toBe(`${PARENT_TRACK_ID}-low`);
	});

	it('recalculates parent values on demand', () => {
		initialisePlayerResourceState(player, catalog);
		setResourceValue(context, player, catalog, RESOURCE_A, 3);
		setResourceValue(context, player, catalog, RESOURCE_B, 2);

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
		setResourceValue(context, player, catalog, RESOURCE_A, 2);

		const outcome = increaseResourceLowerBound(
			context,
			player,
			catalog,
			RESOURCE_A,
			5,
		);

		expect(outcome).toEqual({
			previousBound: 0,
			nextBound: 5,
			valueClamped: true,
		});
		expect(player.resourceLowerBounds[RESOURCE_A]).toBe(5);
		expect(player.resourceValues[RESOURCE_A]).toBe(5);
		expect(player.resourceBoundTouched[RESOURCE_A]).toEqual({
			lower: true,
			upper: false,
		});
	});

	it('clamps when introducing an upper bound', () => {
		initialisePlayerResourceState(player, catalog);
		setResourceValue(context, player, catalog, RESOURCE_A, 9);

		const outcome = increaseResourceUpperBound(
			context,
			player,
			catalog,
			RESOURCE_A,
			5,
		);

		expect(outcome).toEqual({
			previousBound: null,
			nextBound: 5,
			valueClamped: true,
		});
		expect(player.resourceUpperBounds[RESOURCE_A]).toBe(5);
		expect(player.resourceValues[RESOURCE_A]).toBe(5);
		expect(player.resourceBoundTouched[RESOURCE_A]).toEqual({
			lower: false,
			upper: true,
		});
	});

	it('prevents parent lower bounds from exceeding child aggregates', () => {
		initialisePlayerResourceState(player, catalog);
		expect(() =>
			increaseResourceLowerBound(context, player, catalog, PARENT_ID, 3),
		).toThrowError(
			'ResourceV2 parent "resource-parent" cannot raise lower bound beyond its aggregated child total of 0.',
		);
	});

	it('refreshes parent aggregates when raising the upper bound', () => {
		initialisePlayerResourceState(player, catalog);
		increaseResourceUpperBound(context, player, catalog, PARENT_ID, 5);
		setResourceValue(context, player, catalog, RESOURCE_A, 4);
		setResourceValue(context, player, catalog, RESOURCE_B, 4);
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
