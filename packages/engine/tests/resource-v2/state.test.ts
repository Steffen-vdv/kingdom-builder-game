import { describe, it, beforeEach, expect } from 'vitest';
import { PlayerState } from '../../src/state/index.ts';
import type { EngineContext } from '../../src/context.ts';
import {
	initialisePlayerResourceState,
	setResourceValue,
	recalculateGroupParentValue,
	increaseResourceLowerBound,
	increaseResourceUpperBound,
	createRuntimeResourceCatalog,
} from '../../src/resource-v2/index.ts';
import {
	resourceV2Definition,
	resourceV2GroupDefinition,
	createResourceV2Registries,
} from '@kingdom-builder/testing';

type ResourceDefinition = ReturnType<typeof resourceV2Definition>;
type TierTrack = NonNullable<ResourceDefinition['tierTrack']>;

function createTierTrack(prefix: string): TierTrack {
	const trackId = `${prefix}-track`;
	return {
		metadata: {
			id: trackId,
			label: `${trackId}-label`,
			icon: `${trackId}-icon`,
			description: `${trackId}-description`,
		},
		tiers: [
			{
				id: `${trackId}-low`,
				label: 'Low',
				icon: 'icon-low',
				description: 'Low tier',
				order: 0,
				threshold: { max: 3 },
				enterEffects: [],
				exitEffects: [],
			},
			{
				id: `${trackId}-mid`,
				label: 'Mid',
				icon: 'icon-mid',
				description: 'Mid tier',
				order: 1,
				threshold: { min: 4, max: 7 },
				enterEffects: [],
				exitEffects: [],
			},
			{
				id: `${trackId}-high`,
				label: 'High',
				icon: 'icon-high',
				description: 'High tier',
				order: 2,
				threshold: { min: 8 },
				enterEffects: [],
				exitEffects: [],
			},
		],
	} satisfies TierTrack;
}

const groupWithParent = resourceV2GroupDefinition({
	id: 'resource-group',
	parent: {
		id: 'resource-parent',
		label: 'resource-parent-label',
		icon: 'resource-parent-icon',
		lowerBound: 0,
		tierTrack: createTierTrack('resource-parent'),
	},
});

const groupWithoutParent = resourceV2GroupDefinition({
	id: 'no-parent-group',
});

const resourceA = resourceV2Definition({
	id: 'resource-a',
	metadata: {
		label: 'resource-a-label',
		icon: 'resource-a-icon',
		description: 'resource-a-description',
		group: { id: groupWithParent.id },
	},
	bounds: { lowerBound: 0 },
	tierTrack: createTierTrack('resource-a'),
});

const resourceB = resourceV2Definition({
	id: 'resource-b',
	metadata: {
		label: 'resource-b-label',
		icon: 'resource-b-icon',
		description: 'resource-b-description',
		group: { id: groupWithParent.id },
	},
	bounds: { lowerBound: 0, upperBound: 4 },
	tierTrack: createTierTrack('resource-b'),
});

const registries = createResourceV2Registries({
	resources: [resourceA, resourceB],
	groups: [groupWithParent, groupWithoutParent],
});
const catalog = createRuntimeResourceCatalog(registries);

const RESOURCE_A = resourceA.id;
const RESOURCE_B = resourceB.id;
const PARENT_ID = groupWithParent.parent!.id;
const GROUP_ID = groupWithParent.id;
const NO_PARENT_GROUP_ID = groupWithoutParent.id;
const resourceATrack = resourceA.tierTrack!;
const parentTrack = groupWithParent.parent!.tierTrack!;

describe('ResourceV2 state', () => {
	let player: PlayerState;
	let context: EngineContext;

	beforeEach(() => {
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
		expect(player.resourceTierIds[RESOURCE_A]).toBe(resourceATrack.tiers[0].id);
		expect(player.resourceBoundTouched[RESOURCE_A]).toEqual({
			lower: false,
			upper: false,
		});
		expect(player.resourceValues[PARENT_ID]).toBe(0);
		expect(player.resourceTierIds[PARENT_ID]).toBe(parentTrack.tiers[0].id);
	});

	it('writes resource values, recalculates tiers, and logs recent gains', () => {
		initialisePlayerResourceState(player, catalog);

		const nextValue = setResourceValue(context, player, catalog, RESOURCE_A, 8);
		expect(nextValue).toBe(8);
		expect(player.resourceValues[RESOURCE_A]).toBe(8);
		expect(player.resourceTouched[RESOURCE_A]).toBe(true);
		expect(player.resourceTierIds[RESOURCE_A]).toBe(
			resourceATrack.tiers.at(-1)!.id,
		);
		expect(context.recentResourceGains).toEqual([
			{ key: RESOURCE_A, amount: 8 },
		]);
		expect(player.resourceValues[PARENT_ID]).toBe(8);
		expect(player.resourceTouched[PARENT_ID]).toBe(true);
		expect(player.resourceTierIds[PARENT_ID]).toBe(
			parentTrack.tiers.at(-1)!.id,
		);

		const repeat = setResourceValue(context, player, catalog, RESOURCE_A, 8);
		expect(repeat).toBe(8);
		expect(context.recentResourceGains).toHaveLength(1);
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
