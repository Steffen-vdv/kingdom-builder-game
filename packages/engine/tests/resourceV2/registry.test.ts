import { describe, it, expect } from 'vitest';
import {
	createResourceV2Definition,
	createResourceV2Group,
} from '@kingdom-builder/testing';

import { loadResourceV2Registry } from '../../src/resourceV2/registry.ts';

describe('ResourceV2EngineRegistry', () => {
	it('indexes definitions, groups, and metadata from content payloads', () => {
		const group = createResourceV2Group({
			id: 'economy',
			order: 5,
			children: ['wood', 'ore'],
			parentName: 'Economy',
			parentBounds: { lowerBound: 0, upperBound: 500 },
			parentTrackValueBreakdown: true,
			parentTrackBoundBreakdown: true,
			parentTierTrack: (track) =>
				track
					.tierWith('economy-parent-tier-1', (tier) => tier.range(0, 100))
					.tierWith('economy-parent-tier-2', (tier) => tier.range(100, 200)),
		});

		const definition = createResourceV2Definition({
			id: group.children[0]!,
			bounds: { lowerBound: 0, upperBound: 100 },
			trackValueBreakdown: true,
			trackBoundBreakdown: true,
			tierTrack: (track) =>
				track
					.tierWith('economy-tier-1', (tier) => tier.range(0, 25))
					.tierWith('economy-tier-2', (tier) => tier.range(25, 50)),
			group: { groupId: group.id, order: 1 },
			globalActionCost: 3,
		});

		const secondary = createResourceV2Definition({
			id: 'unbound-resource',
			displayAsPercent: true,
		});

		const registry = loadResourceV2Registry({
			resources: [definition, secondary],
			groups: [group],
		});

		const resource = registry.getResource(definition.id);
		expect(resource.definition).toEqual(definition);
		expect(resource.bounds).toEqual(definition.bounds);
		expect(resource.hasBounds).toBe(true);
		expect(registry.getLowerBound(resource.id)).toBe(0);
		expect(registry.getUpperBound(resource.id)).toBe(100);
		expect(registry.hasTierTrack(resource.id)).toBe(true);

		const tierTrack = registry.getTierTrack(resource.id);
		expect(tierTrack).toEqual(definition.tierTrack);
		const firstTierId = tierTrack?.tiers[0]?.id ?? '';
		expect(registry.getTierDefinition(resource.id, firstTierId)).toEqual(
			tierTrack?.tiers[0],
		);

		expect(registry.tracksValueBreakdown(resource.id)).toBe(true);
		expect(registry.tracksBoundBreakdown(resource.id)).toBe(true);
		expect(registry.getGlobalActionCost(resource.id)?.amount).toBe(3);
		expect(registry.getResourceGroupId(resource.id)).toBe(group.id);
		expect(registry.getGroupParentForResource(resource.id)?.id).toBe(
			group.parent.id,
		);
		expect(registry.getResourceIdsForGroup(group.id)).toEqual([resource.id]);

		const secondaryRecord = registry.getResource(secondary.id);
		expect(secondaryRecord.hasTierTrack).toBe(false);
		expect(registry.hasTierTrack(secondary.id)).toBe(false);

		expect(registry.resourceIds).toEqual([definition.id, secondary.id]);

		const groupRecord = registry.getGroup(group.id);
		expect(groupRecord.definition).toEqual(group);
		expect(groupRecord.children).toEqual(group.children);
		expect(groupRecord.parentId).toBe(group.parent.id);

		const parentRecord = registry.getParent(groupRecord.parentId);
		expect(parentRecord.descriptor).toEqual(group.parent);
		expect(parentRecord.bounds).toEqual(group.parent.bounds);
		expect(registry.tracksValueBreakdown(parentRecord.id)).toBe(true);
		expect(registry.tracksBoundBreakdown(parentRecord.id)).toBe(true);
		expect(registry.getGroupIdsForParent(parentRecord.id)).toEqual([group.id]);

		const parentTierTrack = registry.getTierTrack(parentRecord.id);
		expect(parentTierTrack).toEqual(group.parent.tierTrack);
		const parentFirstTierId = parentTierTrack?.tiers[0]?.id ?? '';
		expect(
			registry.getTierDefinition(parentRecord.id, parentFirstTierId),
		).toEqual(parentTierTrack?.tiers[0]);
	});

	it('rejects attempts to mutate virtual parent values', () => {
		const group = createResourceV2Group({
			id: 'immutable',
			parentBounds: { lowerBound: 0, upperBound: 50 },
		});

		const registry = loadResourceV2Registry({ groups: [group] });
		const parentRecord = registry.getParent(group.parent.id);

		expect(() => {
			(parentRecord.descriptor.display as { name: string }).name = 'Mutated';
		}).toThrow(TypeError);

		expect(() => {
			(parentRecord.descriptor.bounds as { lowerBound: number }).lowerBound =
				999;
		}).toThrow(TypeError);
	});
});
