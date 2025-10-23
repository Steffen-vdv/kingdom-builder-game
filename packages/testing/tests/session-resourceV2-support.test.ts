import { describe, expect, it } from 'vitest';

import { createContentFactory } from '@kingdom-builder/testing';
import {
	ResourceV2GroupId,
	ResourceV2GroupParentId,
	ResourceV2Id,
} from '@kingdom-builder/contents';

describe('ResourceV2 metadata helpers', () => {
	it('derives ordered metadata with parent mappings from default registries', () => {
		const factory = createContentFactory();

		const metadata = factory.buildResourceV2Metadata();

		expect(metadata.orderedResourceIds.length).toBeGreaterThan(0);
		expect(metadata.orderedResourceGroupIds.length).toBeGreaterThan(0);

		const parentId = metadata.parentIdByResourceId[ResourceV2Id.CastleHP];
		expect(parentId).toBe(ResourceV2GroupParentId.CastleDefense);

		const parentSnapshot = metadata.resourceGroupParents[parentId];
		expect(parentSnapshot).toBeDefined();
		expect(parentSnapshot?.relation).toBe('sumOfAll');

		const groupSnapshot =
			metadata.resourceGroups[ResourceV2GroupId.CastleDefense];
		expect(groupSnapshot?.children).toContain(ResourceV2Id.CastleHP);
		expect(groupSnapshot?.parent?.id).toBe(
			ResourceV2GroupParentId.CastleDefense,
		);
	});

	it('clones nested metadata for custom ResourceV2 definitions and groups', () => {
		const factory = createContentFactory();
		const parent = factory.resourceGroupParent({
			id: 'parent:tiers',
			name: 'Parent With Tiers',
			order: 100,
			metadata: { spotlight: true },
			tierTrack: {
				id: 'parent-track',
				tiers: [
					{
						id: 'parent-tier',
						range: { min: 0 },
					},
				],
			},
		});
		const resource = factory.resourceV2({
			id: 'resource:tiers',
			name: 'Tiered Resource',
			order: 200,
			metadata: { rarity: 'legendary' },
			tierTrack: {
				id: 'resource-track',
				tiers: [
					{
						id: 'resource-tier',
						range: { min: 0, max: 10 },
					},
				],
			},
			globalActionCost: 3,
			groupId: 'group:tiers',
		});
		factory.resourceGroup({
			id: 'group:tiers',
			name: 'Tiered Group',
			order: 150,
			children: [resource.id],
			parent,
			metadata: { display: 'fancy' },
		});

		const sourceDefinition = factory.resourcesV2.get(resource.id);
		const metadata = factory.buildResourceV2Metadata();

		const resourceSnapshot = metadata.resourceMetadata[resource.id];
		expect(resourceSnapshot).toBeDefined();
		expect(resourceSnapshot?.metadata?.rarity).toBe('legendary');
		expect(resourceSnapshot?.tierTrack?.id).toBe('resource-track');
		expect(resourceSnapshot?.globalActionCost?.amount).toBe(3);
		expect(resourceSnapshot).not.toBe(sourceDefinition);

		const groupSnapshot = metadata.resourceGroups['group:tiers'];
		expect(groupSnapshot?.metadata?.display).toBe('fancy');
		expect(groupSnapshot?.parent?.id).toBe(parent.id);
		expect(groupSnapshot?.parent?.tierTrack?.id).toBe('parent-track');
		expect(groupSnapshot?.parent).not.toBe(parent);

		const parentSnapshot = metadata.resourceGroupParents[parent.id];
		expect(parentSnapshot).toEqual(groupSnapshot?.parent);
	});
});
