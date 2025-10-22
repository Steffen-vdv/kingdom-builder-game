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
import type {
	RuntimeResourceCatalog,
	RuntimeResourceDefinition,
	RuntimeResourceGroup,
	RuntimeResourceGroupParent,
	RuntimeResourceTierDefinition,
	RuntimeResourceTierTrack,
} from '../../src/resource-v2/types.ts';

function createTier(
	id: string,
	min: number | null,
	max: number | null,
	order: number,
): RuntimeResourceTierDefinition {
	return {
		id,
		label: `${id}-label`,
		icon: `${id}-icon`,
		description: `${id}-description`,
		order,
		resolvedOrder: order,
		threshold: { min, max },
		enterEffects: [],
		exitEffects: [],
	};
}

function createTierTrack(id: string): RuntimeResourceTierTrack {
	return {
		metadata: {
			id,
			label: `${id}-label`,
			icon: `${id}-icon`,
			description: `${id}-description`,
			order: null,
			resolvedOrder: 0,
		},
		tiers: [
			createTier(`${id}-low`, null, 3, 0),
			createTier(`${id}-mid`, 4, 7, 1),
			createTier(`${id}-high`, 8, null, 2),
		],
	};
}

function createResource(
	id: string,
	groupId: string | null,
	lowerBound: number | null,
	upperBound: number | null,
	trackId: string,
): RuntimeResourceDefinition {
	return {
		id,
		label: `${id}-label`,
		icon: `${id}-icon`,
		description: `${id}-description`,
		order: null,
		resolvedOrder: 0,
		tags: [],
		lowerBound,
		upperBound,
		displayAsPercent: false,
		trackValueBreakdown: false,
		trackBoundBreakdown: false,
		groupId,
		groupOrder: null,
		resolvedGroupOrder: null,
		globalCost: undefined,
		tierTrack: createTierTrack(trackId),
	};
}

function createParent(
	id: string,
	lowerBound: number | null,
	upperBound: number | null,
): RuntimeResourceGroupParent {
	return {
		id,
		label: `${id}-label`,
		icon: `${id}-icon`,
		description: `${id}-description`,
		order: null,
		resolvedOrder: 0,
		tags: [],
		lowerBound,
		upperBound,
		displayAsPercent: false,
		trackValueBreakdown: false,
		trackBoundBreakdown: false,
		tierTrack: createTierTrack(`${id}-track`),
	};
}

const RESOURCE_A = 'resource-a';
const RESOURCE_B = 'resource-b';
const PARENT_ID = 'resource-parent';
const GROUP_ID = 'resource-group';
const NO_PARENT_GROUP_ID = 'no-parent-group';

const resourceA = createResource(
	RESOURCE_A,
	GROUP_ID,
	0,
	null,
	`${RESOURCE_A}-track`,
);
const resourceB = createResource(
	RESOURCE_B,
	GROUP_ID,
	0,
	4,
	`${RESOURCE_B}-track`,
);
const parent = createParent(PARENT_ID, 0, null);
const groupWithParent: RuntimeResourceGroup = {
	id: GROUP_ID,
	order: null,
	resolvedOrder: 0,
	parent,
};
const groupWithoutParent: RuntimeResourceGroup = {
	id: NO_PARENT_GROUP_ID,
	order: null,
	resolvedOrder: 1,
};

const catalog: RuntimeResourceCatalog = {
	resources: {
		byId: {
			[RESOURCE_A]: resourceA,
			[RESOURCE_B]: resourceB,
		},
		ordered: [resourceA, resourceB],
	},
	groups: {
		byId: {
			[GROUP_ID]: groupWithParent,
			[NO_PARENT_GROUP_ID]: groupWithoutParent,
		},
		ordered: [groupWithParent, groupWithoutParent],
	},
};

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
		expect(player.resourceTierIds[RESOURCE_A]).toBe(`${RESOURCE_A}-track-low`);
		expect(player.resourceBoundTouched[RESOURCE_A]).toEqual({
			lower: false,
			upper: false,
		});
		expect(player.resourceValues[PARENT_ID]).toBe(0);
		expect(player.resourceTierIds[PARENT_ID]).toBe(`${PARENT_ID}-track-low`);
	});

	it('writes resource values, recalculates tiers, and logs recent gains', () => {
		initialisePlayerResourceState(player, catalog);

		const nextValue = setResourceValue(context, player, catalog, RESOURCE_A, 8);
		expect(nextValue).toBe(8);
		expect(player.resourceValues[RESOURCE_A]).toBe(8);
		expect(player.resourceTouched[RESOURCE_A]).toBe(true);
		expect(player.resourceTierIds[RESOURCE_A]).toBe(`${RESOURCE_A}-track-high`);
		expect(context.recentResourceGains).toEqual([
			{ key: RESOURCE_A, amount: 8 },
		]);
		expect(player.resourceValues[PARENT_ID]).toBe(8);
		expect(player.resourceTouched[PARENT_ID]).toBe(true);
		expect(player.resourceTierIds[PARENT_ID]).toBe(`${PARENT_ID}-track-high`);

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

	it('rejects updates for unknown resources', () => {
		initialisePlayerResourceState(player, catalog);
		expect(() =>
			setResourceValue(context, player, catalog, 'unknown', 1),
		).toThrowError('ResourceV2 state does not recognise resource "unknown".');
	});
});
