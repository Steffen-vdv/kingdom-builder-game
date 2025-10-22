import { describe, expect, it } from 'vitest';
import { createContentFactory } from '@kingdom-builder/testing';
import {
	hydrateResourceV2Metadata,
	type ResourceV2RuntimeDefinition,
} from '../src/resourcesV2/index.ts';

const sortByOrder = <T extends { order: number }>(values: T[]) =>
	[...values].sort((a, b) => a.order - b.order);

describe('hydrateResourceV2Metadata', () => {
	it('hydrates runtime resource and group metadata with ordering preserved', () => {
		const content = createContentFactory();
		const catalog = hydrateResourceV2Metadata(
			content.resourcesV2,
			content.resourceGroups,
		);

		const expectedResourceOrder = sortByOrder(content.resourcesV2.values()).map(
			(definition) => definition.id,
		);
		const expectedGroupOrder = sortByOrder(content.resourceGroups.values()).map(
			(group) => group.id,
		);

		expect(catalog.orderedResourceIds).toEqual(expectedResourceOrder);
		expect(catalog.orderedGroupIds).toEqual(expectedGroupOrder);

		for (const id of expectedResourceOrder) {
			expect(catalog.resourcesById[id]).toBeDefined();
		}
		for (const id of expectedGroupOrder) {
			expect(catalog.groupsById[id]).toBeDefined();
		}
	});

	it('maps group parents to their children and exposes percent formatting helpers', () => {
		const content = createContentFactory();
		const catalog = hydrateResourceV2Metadata(
			content.resourcesV2,
			content.resourceGroups,
		);

		const groups = Object.values(catalog.groupsById);
		const groupWithParent = groups.find((group) => group.parent !== undefined);
		expect(groupWithParent?.parent).toBeDefined();
		if (!groupWithParent?.parent) {
			throw new Error(
				'Expected at least one resource group to define a parent',
			);
		}
		for (const childId of groupWithParent.children) {
			expect(catalog.parentIdByResourceId[childId]).toBe(
				groupWithParent.parent.id,
			);
		}

		const percentResource = Object.values<ResourceV2RuntimeDefinition>(
			catalog.resourcesById,
		).find((definition) => definition.isPercent);
		expect(percentResource).toBeDefined();
		if (!percentResource) {
			throw new Error(
				'Expected at least one percent-formatted resource in the catalog',
			);
		}
		expect(percentResource.formatValue(25)).toBe('25%');
		expect(percentResource.formatDelta(10)).toBe('+10%');
		expect(percentResource.formatDelta(-4)).toBe('-4%');
		expect(percentResource.formatDelta(0)).toBe('0%');
	});

	it('preserves tier track payloads when hydrating runtime metadata', () => {
		const content = createContentFactory();
		const tiered = content.resourceV2((builder) =>
			builder
				.id('custom-tiered-resource')
				.name('Custom Tiered Resource')
				.order(999)
				.tierTrack((track) =>
					track
						.id('custom-tier-track')
						.tier((tier) => tier.id('tier-one').range(0, 10))
						.tier((tier) => tier.id('tier-two').range(11)),
				),
		);

		const catalog = hydrateResourceV2Metadata(
			content.resourcesV2,
			content.resourceGroups,
		);
		const runtime = catalog.resourcesById[tiered.id];
		expect(runtime).toBeDefined();
		expect(runtime.tierTrack).toBeDefined();
		expect(runtime.tierTrack?.id).toBe('custom-tier-track');
		expect(runtime.tierTrack?.tiers).toHaveLength(2);
		const [firstTier, secondTier] = runtime.tierTrack?.tiers ?? [];
		expect(firstTier?.range.min).toBe(0);
		expect(firstTier?.range.max).toBe(10);
		expect(secondTier?.range.min).toBe(11);
		expect(secondTier?.range.max).toBeUndefined();
	});

	it('hydrates optional metadata fields, bounds, and costs for resources and parents', () => {
		const content = createContentFactory();

		const parent = content.resourceGroupParent((builder) =>
			builder
				.id('custom-runtime-parent')
				.name('Custom Runtime Parent')
				.order(777)
				.icon('icon-parent-glyph')
				.description('Parent metadata description')
				.percent()
				.lowerBound(10)
				.upperBound(250)
				.trackValueBreakdown()
				.trackBoundBreakdown()
				.metadata({ parentMeta: true })
				.tierTrack((track) =>
					track
						.id('parent-track')
						.tier((tier) => tier.id('alpha').range(0, 50))
						.tier((tier) => tier.id('beta').range(51)),
				),
		);

		const resource = content.resourceV2((builder) =>
			builder
				.id('custom-runtime-resource')
				.name('Custom Runtime Resource')
				.order(888)
				.icon('icon-resource-glyph')
				.description('Resource metadata description')
				.groupId('custom-runtime-group')
				.percent()
				.bounds({ lower: 5, upper: 45 })
				.trackValueBreakdown()
				.trackBoundBreakdown()
				.metadata({ runtimeMeta: 'value' })
				.tierTrack((track) =>
					track
						.id('resource-track')
						.tier((tier) => tier.id('starter').range(0, 10))
						.tier((tier) => tier.id('advanced').range(11, 20)),
				)
				.globalActionCost(3)
				.limited(),
		);

		content.resourceGroup((builder) =>
			builder
				.id('custom-runtime-group')
				.name('Custom Runtime Group')
				.icon('icon-group-glyph')
				.description('Group metadata description')
				.order(999)
				.metadata({ grouped: true })
				.parent(parent)
				.child(resource.id),
		);

		const catalog = hydrateResourceV2Metadata(
			content.resourcesV2,
			content.resourceGroups,
		);

		const runtime = catalog.resourcesById[resource.id];
		expect(runtime).toBeDefined();
		expect(runtime?.groupId).toBe('custom-runtime-group');
		expect(runtime?.metadata).toEqual({ runtimeMeta: 'value' });
		expect(runtime?.limited).toBe(true);
		expect(runtime?.lowerBound).toBe(5);
		expect(runtime?.upperBound).toBe(45);
		expect(runtime?.globalActionCost).toEqual({ amount: 3 });
		expect(runtime?.formatValue(1200)).toBe('1,200%');
		expect(runtime?.formatDelta(5)).toBe('+5%');
		expect(runtime?.formatDelta(-25)).toBe('-25%');
		expect(runtime?.formatDelta(0)).toBe('0%');
		expect(runtime?.tierTrack?.id).toBe('resource-track');
		expect(runtime?.tierTrack?.tiers).toHaveLength(2);

		const runtimeGroup = catalog.groupsById['custom-runtime-group'];
		expect(runtimeGroup).toBeDefined();
		expect(runtimeGroup?.metadata).toEqual({ grouped: true });
		expect(runtimeGroup?.icon).toBe('icon-group-glyph');
		expect(runtimeGroup?.description).toBe('Group metadata description');
		expect(runtimeGroup?.parent).toBeDefined();
		expect(runtimeGroup?.parent?.id).toBe(parent.id);
		expect(runtimeGroup?.parent?.metadata).toEqual({ parentMeta: true });
		expect(runtimeGroup?.parent?.formatValue(25)).toBe('25%');
		expect(runtimeGroup?.parent?.formatDelta(-15)).toBe('-15%');
		expect(runtimeGroup?.parent?.formatDelta(0)).toBe('0%');
		expect(runtimeGroup?.parent?.tierTrack?.id).toBe('parent-track');

		expect(catalog.parentIdByResourceId[resource.id]).toBe(parent.id);
		expect(catalog.parentsById[parent.id]).toBe(runtimeGroup?.parent);
	});
});
