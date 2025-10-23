import { describe, expect, it } from 'vitest';
import {
	RESOURCE_V2,
	ResourceV2GroupId,
	ResourceV2GroupParentId,
	ResourceV2Id,
} from '@kingdom-builder/contents';
import { buildSessionMetadata } from '../src/session/buildSessionMetadata.js';
import { SessionManager } from '../src/session/SessionManager.js';
import { createContentFactory } from '@kingdom-builder/testing';

const sortByOrder = <T extends { order: number; id: string }>(values: T[]) =>
	[...values].sort((left, right) =>
		left.order === right.order
			? left.id.localeCompare(right.id)
			: left.order - right.order,
	);

describe('session metadata ResourceV2 descriptors', () => {
	it('hydrates descriptors, ordering, and parent lookups from default registries', () => {
		const manager = new SessionManager();
		const metadata = manager.getMetadata();

		expect(metadata.resourceMetadata).toBeDefined();
		expect(metadata.resourceGroups).toBeDefined();
		expect(metadata.resourceGroupParents).toBeDefined();
		expect(metadata.orderedResourceIds).toBeDefined();
		expect(metadata.orderedResourceGroupIds).toBeDefined();
		expect(metadata.parentIdByResourceId).toBeDefined();

		const orderedIds = metadata.orderedResourceIds ?? [];
		const expectedOrder = sortByOrder(
			Object.values(RESOURCE_V2).map((definition) => ({
				id: definition.id,
				order: definition.order,
			})),
		).map((definition) => definition.id);
		expect(orderedIds).toEqual(expectedOrder);
		expect(new Set(orderedIds).size).toBe(orderedIds.length);

		const absorption = metadata.resourceMetadata?.[ResourceV2Id.Absorption];
		const absorptionDefinition =
			RESOURCE_V2[ResourceV2Id.Absorption as keyof typeof RESOURCE_V2];
		expect(absorption?.icon).toBe(absorptionDefinition.icon);
		expect(absorption?.isPercent).toBe(true);
		expect(absorption?.trackValueBreakdown).toBe(false);

		const groups = metadata.resourceGroups ?? {};
		const castleDefense = groups[ResourceV2GroupId.CastleDefense];
		expect(castleDefense?.children).toContain(ResourceV2Id.CastleHP);

		const parentId = metadata.parentIdByResourceId?.[ResourceV2Id.CastleHP];
		expect(parentId).toBe(ResourceV2GroupParentId.CastleDefense);

		const parentDescriptor = metadata.resourceGroupParents?.[parentId ?? ''];
		expect(parentDescriptor?.relation).toBe('sumOfAll');
		expect(parentDescriptor?.isPercent).toBe(false);
	});

	it('preserves tier metadata and clones complex structures without duplication', () => {
		const factory = createContentFactory();
		const parent = factory.resourceGroupParent({
			id: 'parent:tiers',
			name: 'Tier Parent',
			order: 10,
			tierTrack: {
				id: 'parent-track',
				tiers: [
					{
						id: 'parent-tier',
						range: { min: 0 },
					},
				],
			},
			metadata: { spotlight: true },
			isPercent: true,
		});
		const tiered = factory.resourceV2({
			id: 'tiered',
			name: 'Tiered Resource',
			order: 7,
			tierTrack: {
				id: 'resource-track',
				tiers: [
					{
						id: 'tier-one',
						range: { min: 0, max: 10 },
					},
				],
			},
			metadata: { rarity: 'legendary' },
			limited: true,
			isPercent: false,
		});
		factory.resourceGroup({
			id: 'tiers',
			name: 'Tiered Group',
			order: 5,
			children: [tiered.id],
			parent,
			metadata: { display: 'fancy' },
		});

		const metadata = buildSessionMetadata({
			buildings: factory.buildings,
			developments: factory.developments,
			populations: factory.populations,
			resources: {},
			resourcesV2: Object.fromEntries(factory.resourcesV2.entries()),
			resourceGroups: Object.fromEntries(factory.resourceGroups.entries()),
			phases: [],
		});

		const resourceSnapshot = metadata.resourceMetadata?.[tiered.id];
		expect(resourceSnapshot).toBeDefined();
		expect(resourceSnapshot?.tierTrack?.id).toBe('resource-track');
		expect(resourceSnapshot?.tierTrack).not.toBe(
			factory.resourcesV2.get(tiered.id)?.tierTrack,
		);
		expect(resourceSnapshot?.metadata?.rarity).toBe('legendary');
		expect(resourceSnapshot?.limited).toBe(true);
		expect(resourceSnapshot?.metadata).not.toBe(
			factory.resourcesV2.get(tiered.id)?.metadata,
		);

		const groupSnapshot = metadata.resourceGroups?.tiers;
		expect(groupSnapshot?.parent?.id).toBe(parent.id);
		expect(groupSnapshot?.metadata?.display).toBe('fancy');
		expect(groupSnapshot?.parent?.tierTrack?.id).toBe('parent-track');
		expect(groupSnapshot?.parent).not.toBe(parent);

		const parentSnapshot = metadata.resourceGroupParents?.[parent.id];
		expect(parentSnapshot).toBeDefined();
		expect(parentSnapshot).toEqual(groupSnapshot?.parent);

		const ordered = metadata.orderedResourceIds ?? [];
		expect(new Set(ordered).size).toBe(ordered.length);
	});
});
