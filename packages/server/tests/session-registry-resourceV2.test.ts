import { describe, expect, it } from 'vitest';
import { RESOURCE_V2, RESOURCE_GROUPS_V2 } from '@kingdom-builder/contents';
import { SessionManager } from '../src/session/SessionManager.js';
import { buildSessionAssets } from '../src/session/sessionConfigAssets.js';
import { createSyntheticSessionManager } from './helpers/createSyntheticSessionManager.js';

describe('session registries ResourceV2 integration', () => {
	it('includes sorted ResourceV2 definitions and groups', () => {
		const manager = new SessionManager();
		const registries = manager.getRegistries();
		const resourcesV2 = registries.resourcesV2;
		const resourceGroups = registries.resourceGroups;

		expect(resourcesV2).toBeDefined();
		expect(resourceGroups).toBeDefined();

		const resourceIds = Object.keys(resourcesV2 ?? {});
		expect(resourceIds.length).toBeGreaterThan(0);
		const expectedResourceOrder = [...resourceIds].sort((a, b) => {
			const left = resourcesV2?.[a]?.order ?? 0;
			const right = resourcesV2?.[b]?.order ?? 0;
			if (left !== right) {
				return left - right;
			}
			return a.localeCompare(b);
		});
		expect(resourceIds).toEqual(expectedResourceOrder);

		const [firstResourceId] = resourceIds;
		if (!firstResourceId) {
			throw new Error('Expected at least one ResourceV2 definition.');
		}
		const clonedDefinition = resourcesV2?.[firstResourceId];
		const originalDefinition =
			RESOURCE_V2[firstResourceId as keyof typeof RESOURCE_V2];
		expect(clonedDefinition).toEqual(originalDefinition);
		expect(clonedDefinition).not.toBe(originalDefinition);
		if (clonedDefinition?.metadata && originalDefinition?.metadata) {
			expect(clonedDefinition.metadata).not.toBe(originalDefinition.metadata);
		}

		const groupIds = Object.keys(resourceGroups ?? {});
		expect(groupIds.length).toBeGreaterThan(0);
		const expectedGroupOrder = [...groupIds].sort((a, b) => {
			const left = resourceGroups?.[a]?.order ?? 0;
			const right = resourceGroups?.[b]?.order ?? 0;
			if (left !== right) {
				return left - right;
			}
			return a.localeCompare(b);
		});
		expect(groupIds).toEqual(expectedGroupOrder);

		const [firstGroupId] = groupIds;
		if (!firstGroupId) {
			throw new Error('Expected at least one ResourceV2 group.');
		}
		const clonedGroup = resourceGroups?.[firstGroupId];
		const originalGroup =
			RESOURCE_GROUPS_V2[firstGroupId as keyof typeof RESOURCE_GROUPS_V2];
		expect(clonedGroup).toEqual(originalGroup);
		expect(clonedGroup).not.toBe(originalGroup);
		if (clonedGroup?.metadata && originalGroup?.metadata) {
			expect(clonedGroup.metadata).not.toBe(originalGroup.metadata);
		}
		if (clonedGroup?.parent && originalGroup?.parent) {
			expect(clonedGroup.parent).not.toBe(originalGroup.parent);
		}
	});

	it('falls back gracefully when base registries omit ResourceV2 data', () => {
		const { manager, factory, phases, start, rules } =
			createSyntheticSessionManager();
		const baseRegistries = manager.getRegistries();
		delete baseRegistries.resourcesV2;
		delete baseRegistries.resourceGroups;
		const { registries } = buildSessionAssets(
			{
				baseOptions: {
					actions: factory.actions,
					actionCategories: factory.categories,
					buildings: factory.buildings,
					developments: factory.developments,
					populations: factory.populations,
					phases,
					start,
					rules,
				},
				resourceOverrides: undefined,
				baseRegistries,
				baseMetadata: manager.getMetadata(),
			},
			undefined,
		);

		expect(registries.resourcesV2).toBeUndefined();
		expect(registries.resourceGroups).toBeUndefined();
		expect(Object.keys(registries.resources)).not.toHaveLength(0);
	});
});
