import { describe, expect, it } from 'vitest';

import { RESOURCE_GROUPS_V2, RESOURCE_V2, ResourceV2GroupId, createResourceGroupV2Registry, createResourceV2Registry } from '../src/resourceV2';

describe('createResourceV2Registry', () => {
	it('returns a frozen record keyed by resource id', () => {
		const registry = createResourceV2Registry();

		expect(registry).not.toBe(RESOURCE_V2);
		expect(registry).toEqual(RESOURCE_V2);
		expect(Object.isFrozen(registry)).toBe(true);
		for (const definition of Object.values(registry)) {
			expect(Object.isFrozen(definition)).toBe(true);
		}
	});

	it('preserves insertion order consistent with the order metadata', () => {
		const registryValues = Object.values(RESOURCE_V2);
		const sortedByOrder = [...registryValues].sort((a, b) => a.order - b.order);
		const idsInRegistryOrder = registryValues.map((definition) => definition.id);
		const idsByOrder = sortedByOrder.map((definition) => definition.id);

		expect(idsInRegistryOrder).toEqual(idsByOrder);
	});
});

describe('createResourceGroupV2Registry', () => {
	it('returns a frozen record keyed by group id', () => {
		const registry = createResourceGroupV2Registry();

		expect(registry).not.toBe(RESOURCE_GROUPS_V2);
		expect(registry).toEqual(RESOURCE_GROUPS_V2);
		expect(Object.isFrozen(registry)).toBe(true);
		for (const group of Object.values(registry)) {
			expect(Object.isFrozen(group)).toBe(true);
			expect(Object.isFrozen(group.children)).toBe(true);
			if (group.parent) {
				expect(Object.isFrozen(group.parent)).toBe(true);
			}
		}
	});
});

describe('RESOURCE_GROUPS_V2', () => {
	it('only references known resource definitions', () => {
		for (const group of Object.values(RESOURCE_GROUPS_V2)) {
			for (const childId of group.children) {
				expect(RESOURCE_V2[childId]).toBeDefined();
				expect(RESOURCE_V2[childId].groupId).toBe(group.id);
			}
		}
	});

	it('ensures parents are limited sum-of-all definitions with ordered children', () => {
		for (const group of Object.values(RESOURCE_GROUPS_V2)) {
			expect(group.parent).toBeDefined();
			expect(group.parent?.limited).toBe(true);
			expect(group.parent?.relation).toBe('sumOfAll');

			const childOrders = group.children.map((childId) => RESOURCE_V2[childId].order);
			expect(childOrders).toEqual([...childOrders].sort((a, b) => a - b));
		}
	});

	it('keeps group ids stable for downstream lookups', () => {
		const enumValues = Object.values(ResourceV2GroupId).sort();
		const registryKeys = Object.keys(RESOURCE_GROUPS_V2).sort();

		expect(enumValues).toEqual(registryKeys);
	});
});
