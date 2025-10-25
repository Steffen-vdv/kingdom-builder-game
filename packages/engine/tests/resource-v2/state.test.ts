import { beforeEach, describe, expect, it } from 'vitest';
import {
	createResourceV2Registries,
	resourceV2Definition,
	resourceV2GroupDefinition,
} from '@kingdom-builder/testing';

import type { EngineContext } from '../../src/context.ts';
import { PlayerState } from '../../src/state/index.ts';
import {
	createRuntimeResourceCatalog,
	increaseResourceLowerBound,
	increaseResourceUpperBound,
	initialisePlayerResourceState,
	recalculateGroupParentValue,
	setResourceValue,
} from '../../src/resource-v2/index.ts';

function createTierTrack(id: string) {
	return {
		metadata: {
			id,
			label: `${id}-label`,
		},
		tiers: [
			{
				id: `${id}-low`,
				label: `${id}-low-label`,
				threshold: { max: 3 },
			},
			{
				id: `${id}-mid`,
				label: `${id}-mid-label`,
				threshold: { min: 4, max: 7 },
			},
			{
				id: `${id}-high`,
				label: `${id}-high-label`,
				threshold: { min: 8 },
			},
		],
	} as const;
}

const groupWithParent = resourceV2GroupDefinition({
	id: 'group:with-parent',
	parent: {
		id: 'resource:parent',
		lowerBound: 0,
		tierTrack: createTierTrack('parent-track'),
	},
});
const groupWithoutParent = resourceV2GroupDefinition({
	id: 'group:without-parent',
});

const resourceA = resourceV2Definition({
	id: 'resource:a',
	metadata: { group: { id: groupWithParent.id } },
	bounds: { lowerBound: 0 },
	tierTrack: createTierTrack('resource-a-track'),
});
const resourceB = resourceV2Definition({
	id: 'resource:b',
	metadata: { group: { id: groupWithParent.id } },
	bounds: { lowerBound: 0, upperBound: 4 },
	tierTrack: createTierTrack('resource-b-track'),
});

const registries = createResourceV2Registries({
	resources: [resourceA, resourceB],
	groups: [groupWithParent, groupWithoutParent],
});
const catalog = createRuntimeResourceCatalog(registries);

const resourceAId = resourceA.id;
const resourceBId = resourceB.id;
const groupId = groupWithParent.id;
const parentId = groupWithParent.parent!.id;
const noParentGroupId = groupWithoutParent.id;

const resourceATierTrack = catalog.resources.byId[resourceAId].tierTrack!;
const resourceATierLowId = resourceATierTrack.tiers[0].id;
const resourceATierHighId = resourceATierTrack.tiers[2].id;
const parentTierTrack = catalog.groups.byId[groupId].parent!.tierTrack!;
const parentTierLowId = parentTierTrack.tiers[0].id;
const parentTierHighId = parentTierTrack.tiers[2].id;

describe('ResourceV2 state', () => {
	let player: PlayerState;
	let context: EngineContext;

	beforeEach(() => {
		player = new PlayerState('A', 'Tester');
		context = { recentResourceGains: [] } as unknown as EngineContext;
	});

	it('initialises player records and parent aggregates', () => {
		player.resourceValues[resourceAId] = 99;
		player.resourceLowerBounds[resourceAId] = 1;
		player.resourceUpperBounds[resourceAId] = 1;
		player.resourceTouched[resourceAId] = true;
		player.resourceTierIds[resourceAId] = 'stale-tier';
		player.resourceBoundTouched[resourceAId] = { lower: true, upper: true };

		initialisePlayerResourceState(player, catalog);

		expect(player.resourceValues[resourceAId]).toBe(0);
		expect(player.resourceLowerBounds[resourceAId]).toBe(0);
		expect(player.resourceUpperBounds[resourceAId]).toBeNull();
		expect(player.resourceTouched[resourceAId]).toBe(false);
		expect(player.resourceTierIds[resourceAId]).toBe(resourceATierLowId);
		expect(player.resourceBoundTouched[resourceAId]).toEqual({
			lower: false,
			upper: false,
		});
		expect(player.resourceValues[parentId]).toBe(0);
		expect(player.resourceTierIds[parentId]).toBe(parentTierLowId);
	});

	it('writes resource values, recalculates tiers, and logs recent gains', () => {
		initialisePlayerResourceState(player, catalog);

		const nextValue = setResourceValue(
			context,
			player,
			catalog,
			resourceAId,
			8,
		);
		expect(nextValue).toBe(8);
		expect(player.resourceValues[resourceAId]).toBe(8);
		expect(player.resourceTouched[resourceAId]).toBe(true);
		expect(player.resourceTierIds[resourceAId]).toBe(resourceATierHighId);
		expect(context.recentResourceGains).toEqual([
			{ key: resourceAId, amount: 8 },
		]);
		expect(player.resourceValues[parentId]).toBe(8);
		expect(player.resourceTouched[parentId]).toBe(true);
		expect(player.resourceTierIds[parentId]).toBe(parentTierHighId);

		const repeat = setResourceValue(context, player, catalog, resourceAId, 8);
		expect(repeat).toBe(8);
		expect(context.recentResourceGains).toHaveLength(1);
	});

	it('recalculates parent values on demand', () => {
		initialisePlayerResourceState(player, catalog);
		setResourceValue(context, player, catalog, resourceAId, 3);
		setResourceValue(context, player, catalog, resourceBId, 2);

		const result = recalculateGroupParentValue(
			context,
			player,
			catalog,
			groupId,
		);

		expect(result).toBe(5);
		expect(player.resourceValues[parentId]).toBe(5);
		expect(player.resourceTouched[parentId]).toBe(true);
	});

	it('returns null when recalculating a group without a parent', () => {
		initialisePlayerResourceState(player, catalog);
		const result = recalculateGroupParentValue(
			context,
			player,
			catalog,
			noParentGroupId,
		);
		expect(result).toBeNull();
	});

	it('clamps when raising lower bounds and records bound flags', () => {
		initialisePlayerResourceState(player, catalog);
		setResourceValue(context, player, catalog, resourceAId, 2);

		const outcome = increaseResourceLowerBound(
			context,
			player,
			catalog,
			resourceAId,
			5,
		);

		expect(outcome).toEqual({
			previousBound: 0,
			nextBound: 5,
			valueClamped: true,
		});
		expect(player.resourceLowerBounds[resourceAId]).toBe(5);
		expect(player.resourceValues[resourceAId]).toBe(5);
		expect(player.resourceBoundTouched[resourceAId]).toEqual({
			lower: true,
			upper: false,
		});
	});

	it('clamps when introducing an upper bound', () => {
		initialisePlayerResourceState(player, catalog);
		setResourceValue(context, player, catalog, resourceAId, 9);

		const outcome = increaseResourceUpperBound(
			context,
			player,
			catalog,
			resourceAId,
			5,
		);

		expect(outcome).toEqual({
			previousBound: null,
			nextBound: 5,
			valueClamped: true,
		});
		expect(player.resourceUpperBounds[resourceAId]).toBe(5);
		expect(player.resourceValues[resourceAId]).toBe(5);
		expect(player.resourceBoundTouched[resourceAId]).toEqual({
			lower: false,
			upper: true,
		});
	});

	it('prevents parent lower bounds from exceeding child aggregates', () => {
		initialisePlayerResourceState(player, catalog);
		expect(() =>
			increaseResourceLowerBound(context, player, catalog, parentId, 3),
		).toThrowError(
			'ResourceV2 parent "resource:parent" cannot raise lower bound beyond its aggregated child total of 0.',
		);
	});

	it('refreshes parent aggregates when raising the upper bound', () => {
		initialisePlayerResourceState(player, catalog);
		increaseResourceUpperBound(context, player, catalog, parentId, 5);
		setResourceValue(context, player, catalog, resourceAId, 4);
		setResourceValue(context, player, catalog, resourceBId, 4);
		const previousLogEntries = context.recentResourceGains.length;

		const outcome = increaseResourceUpperBound(
			context,
			player,
			catalog,
			parentId,
			3,
		);

		expect(outcome).toEqual({
			previousBound: 5,
			nextBound: 8,
			valueClamped: false,
		});
		expect(player.resourceUpperBounds[parentId]).toBe(8);
		expect(player.resourceValues[parentId]).toBe(8);
		expect(context.recentResourceGains).toHaveLength(previousLogEntries);
	});

	it('rejects updates for unknown resources', () => {
		initialisePlayerResourceState(player, catalog);
		expect(() =>
			setResourceValue(context, player, catalog, 'unknown', 1),
		).toThrowError('ResourceV2 state does not recognise resource "unknown".');
	});
});
