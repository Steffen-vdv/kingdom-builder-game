import { describe, expect, it } from 'vitest';
import {
	ResourceV2GroupId,
	ResourceV2GroupParentId,
	ResourceV2Id,
} from '@kingdom-builder/contents';
import { SessionManager } from '../src/session/SessionManager.js';

describe('session metadata ResourceV2 descriptors', () => {
	it('includes ordered ResourceV2 descriptors with tier metadata', () => {
		const manager = new SessionManager();
		const metadata = manager.getMetadata();
		const resourceDescriptors = metadata.resources ?? {};
		const descriptorKeys = Object.keys(resourceDescriptors);
		expect(new Set(descriptorKeys).size).toBe(descriptorKeys.length);
		const goldDescriptor = resourceDescriptors[ResourceV2Id.Gold];
		expect(goldDescriptor?.label).toBe('Gold');
		expect(goldDescriptor?.icon).toBeDefined();
		const absorptionDescriptor = resourceDescriptors[ResourceV2Id.Absorption];
		expect(absorptionDescriptor?.displayAsPercent).toBe(true);
		const parentDescriptor =
			resourceDescriptors[ResourceV2GroupParentId.KingdomCore];
		expect(parentDescriptor?.label).toBe('Kingdom Core Total');

		const resources = metadata.resourceMetadata;
		expect(resources).toBeDefined();
		if (!resources) {
			return;
		}
		const orderedIds = metadata.orderedResourceIds ?? [];
		expect(orderedIds.length).toBe(Object.keys(resources).length);
		expect(new Set(orderedIds).size).toBe(orderedIds.length);
		const sortedIds = [...orderedIds].sort((a, b) => {
			const left = resources[a]?.order ?? 0;
			const right = resources[b]?.order ?? 0;
			if (left !== right) {
				return left - right;
			}
			return a.localeCompare(b);
		});
		expect(orderedIds).toEqual(sortedIds);

		const gold = resources[ResourceV2Id.Gold];
		expect(gold).toBeDefined();
		if (gold) {
			expect(gold.trackValueBreakdown).toBe(true);
			expect(gold.groupId).toBe(ResourceV2GroupId.KingdomCore);
			expect(gold.parentId).toBe(ResourceV2GroupParentId.KingdomCore);
		}

		const actionPoints = resources[ResourceV2Id.ActionPoints];
		expect(actionPoints?.globalActionCost?.amount).toBe(1);

		const absorption = resources[ResourceV2Id.Absorption];
		expect(absorption?.isPercent).toBe(true);
		expect(absorption?.upperBound).toBe(100);

		const growth = resources[ResourceV2Id.Growth];
		expect(growth?.isPercent).toBe(true);

		const parentMap = metadata.parentIdByResourceId ?? {};
		expect(Object.keys(parentMap).length).toBeGreaterThan(0);
		for (const [resourceId, parentId] of Object.entries(parentMap)) {
			expect(resources[resourceId]).toBeDefined();
			expect(parentId.length).toBeGreaterThan(0);
		}
	});

	it('includes grouped descriptors with parent metadata and no duplicates', () => {
		const manager = new SessionManager();
		const metadata = manager.getMetadata();
		const groups = metadata.resourceGroups;
		expect(groups).toBeDefined();
		if (!groups) {
			return;
		}
		const orderedGroups = metadata.orderedResourceGroupIds ?? [];
		expect(orderedGroups.length).toBe(Object.keys(groups).length);
		expect(new Set(orderedGroups).size).toBe(orderedGroups.length);
		const sortedGroupIds = [...orderedGroups].sort((a, b) => {
			const left = groups[a]?.order ?? 0;
			const right = groups[b]?.order ?? 0;
			if (left !== right) {
				return left - right;
			}
			return a.localeCompare(b);
		});
		expect(orderedGroups).toEqual(sortedGroupIds);

		const kingdomCore = groups[ResourceV2GroupId.KingdomCore];
		expect(kingdomCore).toBeDefined();
		if (kingdomCore?.parent) {
			expect(kingdomCore.parent.id).toBe(ResourceV2GroupParentId.KingdomCore);
			expect(kingdomCore.parent.limited).toBe(true);
			expect(kingdomCore.parent.trackValueBreakdown).toBe(true);
		}
		expect(kingdomCore?.children).toContain(ResourceV2Id.Gold);
		expect(kingdomCore?.children).toContain(ResourceV2Id.ActionPoints);

		const castleDefense = groups[ResourceV2GroupId.CastleDefense];
		expect(castleDefense?.children).toContain(ResourceV2Id.CastleHP);
		if (castleDefense?.parent) {
			expect(castleDefense.parent.id).toBe(
				ResourceV2GroupParentId.CastleDefense,
			);
			expect(castleDefense.parent.icon).toBeDefined();
		}

		const parentMap = metadata.parentIdByResourceId ?? {};
		for (const group of Object.values(groups)) {
			if (!group?.parent) {
				continue;
			}
			for (const child of group.children) {
				expect(parentMap[child]).toBe(group.parent.id);
			}
		}
	});
});
