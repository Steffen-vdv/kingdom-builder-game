import { describe, it, expect, beforeEach } from 'vitest';
import {
	createRuntimeResourceCatalog,
	clampToBounds,
	assertInteger,
	clearRecord,
	ensureBoundFlags,
	resolveTierId,
	writeInitialState,
	aggregateChildValues,
	getCatalogIndexes,
	resolveResourceDefinition,
} from '../../src/resource-v2/index.ts';
import { PlayerState } from '../../src/state/index.ts';
import {
	resourceDefinition,
	resourceGroupDefinition,
	createResourceRegistries,
} from '@kingdom-builder/testing';

const tierTrack = {
	metadata: {
		id: 'test-track',
		label: 'Test Track',
	},
	tiers: [
		{
			id: 'tier-low',
			label: 'Low',
			threshold: { max: 2 },
		},
		{
			id: 'tier-mid',
			label: 'Mid',
			threshold: { min: 3, max: 6 },
		},
		{
			id: 'tier-high',
			label: 'High',
			threshold: { min: 7 },
		},
	],
} as const;

describe('Resource state helpers', () => {
	let player: PlayerState;
	const groupDefinition = resourceGroupDefinition({
		id: 'group-alpha',
		parent: {
			lowerBound: 2,
			upperBound: 15,
			tierTrack,
		},
	});
	const resourceDefinition = resourceDefinition({
		id: 'resource-alpha',
		metadata: {
			group: { id: groupDefinition.id },
		},
		bounds: { lowerBound: 1, upperBound: 9 },
		tierTrack,
	});
	let catalog = createRuntimeResourceCatalog(
		createResourceRegistries({
			resources: [resourceDefinition],
			groups: [groupDefinition],
		}),
	);

	beforeEach(() => {
		player = new PlayerState('A', 'Helper Tester');
	});

	it('clamps values against lower and upper bounds', () => {
		expect(clampToBounds(5, 1, 9)).toBe(5);
		expect(clampToBounds(-3, 1, 9)).toBe(1);
		expect(clampToBounds(14, 1, 9)).toBe(9);
	});

	it('throws when integer assertions receive fractional input', () => {
		expect(() => assertInteger(3.2, '"test" value')).toThrowError(
			'Resource state expected "test" value to be an integer but received 3.2.',
		);
	});

	it('clears records in-place', () => {
		const record: Record<string, number> = { a: 1, b: 2 };
		clearRecord(record);
		expect(record).toEqual({});
	});

	it('ensures bound flags are initialised and reuses the same object', () => {
		const created = ensureBoundFlags(player, resourceDefinition.id);
		expect(created).toEqual({ lower: false, upper: false });
		created.lower = true;
		expect(ensureBoundFlags(player, resourceDefinition.id)).toBe(created);
	});

	it('resolves tier ids based on inclusive thresholds', () => {
		expect(resolveTierId(tierTrack, 0)).toBe('tier-low');
		expect(resolveTierId(tierTrack, 3)).toBe('tier-mid');
		expect(resolveTierId(tierTrack, 8)).toBe('tier-high');
	});

	it('writes initial state with tier metadata and untouched flags', () => {
		writeInitialState(player, resourceDefinition.id, 1, 9, tierTrack, 3);
		expect(player.resourceValues[resourceDefinition.id]).toBe(3);
		expect(player.resourceLowerBounds[resourceDefinition.id]).toBe(1);
		expect(player.resourceUpperBounds[resourceDefinition.id]).toBe(9);
		expect(player.resourceTouched[resourceDefinition.id]).toBe(false);
		expect(player.resourceTierIds[resourceDefinition.id]).toBe('tier-mid');
		expect(player.resourceBoundTouched[resourceDefinition.id]).toEqual({
			lower: false,
			upper: false,
		});
	});

	it('aggregates child resource totals', () => {
		player.resourceValues['child-a'] = 4;
		player.resourceValues['child-b'] = 6;
		expect(aggregateChildValues(player, ['child-a', 'child-b'])).toBe(10);
	});

	it('indexes catalog entries for resources and parents', () => {
		const indexes = getCatalogIndexes(catalog);
		expect(indexes.resourceById[resourceDefinition.id]).toBeDefined();
		const parentId = groupDefinition.parent!.id;
		expect(indexes.parentById[parentId]).toBeDefined();
		expect(indexes.groupChildren[groupDefinition.id]).toEqual([
			resourceDefinition.id,
		]);
	});

	it('resolves definitions for resources and parent group aggregates', () => {
		const resourceLookup = resolveResourceDefinition(
			catalog,
			resourceDefinition.id,
		);
		expect(resourceLookup).not.toBeNull();
		expect(resourceLookup).toMatchObject({
			kind: 'resource',
			groupId: groupDefinition.id,
		});

		const parentId = groupDefinition.parent!.id;
		const parentLookup = resolveResourceDefinition(catalog, parentId);
		expect(parentLookup).not.toBeNull();
		expect(parentLookup).toMatchObject({
			kind: 'parent',
			groupId: groupDefinition.id,
		});

		expect(resolveResourceDefinition(catalog, 'missing')).toBeNull();
	});
});
