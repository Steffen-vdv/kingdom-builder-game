import { describe, expect, it } from 'vitest';

import { RESOURCE_V2, RESOURCE_V2_MIGRATION_SCAFFOLD, ResourceV2Id, createMigrationScaffold, createOrderAllocator, reuseMetadata } from '../src/resourceV2';

describe('RESOURCE_V2_MIGRATION_SCAFFOLD', () => {
	it('exposes empty, frozen collections by default', () => {
		expect(RESOURCE_V2_MIGRATION_SCAFFOLD.definitions).toHaveLength(0);
		expect(RESOURCE_V2_MIGRATION_SCAFFOLD.groups).toHaveLength(0);
		expect(Object.isFrozen(RESOURCE_V2_MIGRATION_SCAFFOLD.definitions)).toBe(true);
		expect(Object.isFrozen(RESOURCE_V2_MIGRATION_SCAFFOLD.groups)).toBe(true);
	});

	it('allows creating additional frozen scaffolds for migrations', () => {
		const scaffold = createMigrationScaffold([RESOURCE_V2[ResourceV2Id.Gold]]);

		expect(scaffold).not.toBe(RESOURCE_V2_MIGRATION_SCAFFOLD);
		expect(scaffold.definitions).toEqual([RESOURCE_V2[ResourceV2Id.Gold]]);
		expect(Object.isFrozen(scaffold.definitions)).toBe(true);
		expect(Object.isFrozen(scaffold.groups)).toBe(true);
	});
});

describe('createOrderAllocator', () => {
	it('starts at zero by default and increments sequentially', () => {
		const allocator = createOrderAllocator();

		expect(allocator.peek()).toBe(0);
		expect(allocator.next()).toBe(0);
		expect(allocator.peek()).toBe(1);
		expect(allocator.next()).toBe(1);
		expect(allocator.peek()).toBe(2);
	});

	it('respects reserved order slots while advancing the cursor', () => {
		const allocator = createOrderAllocator();

		expect(allocator.reserve(5)).toBe(5);
		expect(allocator.peek()).toBe(6);
		expect(allocator.next()).toBe(6);
		expect(allocator.peek()).toBe(7);
	});
});

describe('reuseMetadata', () => {
	it('returns undefined when both base and overrides are missing', () => {
		expect(reuseMetadata(undefined)).toBeUndefined();
	});

	it('merges overrides into a frozen metadata object', () => {
		const base = { icon: '🛠️', description: 'Base metadata' } as const;
		const merged = reuseMetadata(base, { description: 'Override description' });

		expect(merged).toEqual({ icon: '🛠️', description: 'Override description' });
		expect(Object.isFrozen(merged)).toBe(true);
	});
});
