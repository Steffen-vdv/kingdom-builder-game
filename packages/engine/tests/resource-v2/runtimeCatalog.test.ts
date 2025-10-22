import { describe, expect, it } from 'vitest';
import {
	resourceV2Definition,
	resourceV2GroupDefinition,
} from '@kingdom-builder/testing';
import type {
	ContentOrderedRegistry,
	ContentResourceDefinition,
	ContentResourceGroupDefinition,
} from '../../src/resource-v2/content-types.js';
import { createRuntimeResourceCatalog } from '../../src/resource-v2/fromContent.js';

type RegistryInput<T extends { id: string }> = readonly T[];

function toRegistry<T extends { id: string }>(
	items: RegistryInput<T>,
): ContentOrderedRegistry<T> {
	const ordered = [...items];
	const byId: Record<string, T> = {};
	for (const item of ordered) {
		byId[item.id] = item;
	}
	return { byId, ordered };
}

describe('createRuntimeResourceCatalog', () => {
	it('normalizes metadata, bounds, ordering, and tier tracks from content definitions', () => {
		const groupWithParent = resourceV2GroupDefinition({
			id: 'group-with-parent',
			parent: {
				order: 3,
				lowerBound: -5,
				upperBound: 25,
				trackValueBreakdown: true,
				trackBoundBreakdown: true,
				tierTrack: {
					metadata: {
						id: 'parent-track',
						label: 'Parent Track',
						description: 'Parent description',
					},
					tiers: [
						{
							id: 'parent-tier-1',
							label: 'Tier One',
							order: 2,
							threshold: { min: 2, max: 4 },
							enterEffects: [],
							exitEffects: [],
						},
						{
							id: 'parent-tier-2',
							label: 'Tier Two',
							threshold: {},
						},
					],
				},
			},
		});
		const groupWithoutOrder = resourceV2GroupDefinition({
			id: 'group-no-order',
		});

		const resourceWithOrder = resourceV2Definition({
			id: 'resource-with-order',
			metadata: {
				order: 8,
				tags: ['alpha', 'beta'],
				trackValueBreakdown: true,
				trackBoundBreakdown: true,
				group: { id: groupWithParent.id, order: 4 },
			},
			bounds: { lowerBound: 0, upperBound: 10 },
			tierTrack: {
				metadata: {
					id: 'resource-track',
					label: 'Resource Track',
				},
				tiers: [
					{
						id: 'resource-tier-1',
						label: 'Resource Tier 1',
						threshold: { min: 1 },
						order: 7,
					},
				],
			},
		});

		const resourceWithoutGroupOrder = resourceV2Definition({
			id: 'resource-without-group-order',
			metadata: {
				group: { id: groupWithParent.id },
				displayAsPercent: true,
			},
			bounds: { lowerBound: -2 },
		});

		const resourceWithoutGroup = resourceV2Definition({
			id: 'resource-without-group',
			metadata: {
				trackBoundBreakdown: true,
			},
			globalCost: 6,
		});

		const registry = createRuntimeResourceCatalog({
			groups: toRegistry<ContentResourceGroupDefinition>([
				groupWithParent,
				groupWithoutOrder,
			]),
			resources: toRegistry<ContentResourceDefinition>([
				resourceWithOrder,
				resourceWithoutGroupOrder,
				resourceWithoutGroup,
			]),
		});

		expect(registry.groups.ordered).toHaveLength(2);
		const parentGroup = registry.groups.byId[groupWithParent.id]!;
		expect(parentGroup.order).toBeNull();
		expect(parentGroup.resolvedOrder).toBe(0);
		expect(parentGroup.parent?.resolvedOrder).toBe(3);
		expect(parentGroup.parent?.lowerBound).toBe(-5);
		expect(parentGroup.parent?.upperBound).toBe(25);
		expect(parentGroup.parent?.tierTrack?.metadata.resolvedOrder).toBe(0);
		expect(
			parentGroup.parent?.tierTrack?.tiers.map((tier) => tier.resolvedOrder),
		).toEqual([2, 1]);
		expect(parentGroup.parent?.tierTrack?.tiers[0]?.threshold).toEqual({
			min: 2,
			max: 4,
		});
		expect(Object.isFrozen(parentGroup.parent?.tierTrack?.tiers ?? [])).toBe(
			true,
		);

		const fallbackGroup = registry.groups.byId[groupWithoutOrder.id]!;
		expect(fallbackGroup.order).toBeNull();
		expect(fallbackGroup.resolvedOrder).toBe(1);

		const [withOrder, withoutGroupOrder, withoutGroup] =
			registry.resources.ordered;
		expect(withOrder.id).toBe(resourceWithOrder.id);
		expect(withOrder.order).toBe(8);
		expect(withOrder.resolvedOrder).toBe(8);
		expect(withOrder.groupId).toBe(groupWithParent.id);
		expect(withOrder.groupOrder).toBe(4);
		expect(withOrder.resolvedGroupOrder).toBe(4);
		expect(withOrder.tags).toEqual(['alpha', 'beta']);
		expect(Object.isFrozen(withOrder.tags)).toBe(true);
		expect(withOrder.trackValueBreakdown).toBe(true);
		expect(withOrder.trackBoundBreakdown).toBe(true);
		expect(withOrder.tierTrack?.metadata.resolvedOrder).toBe(0);
		expect(withOrder.tierTrack?.tiers[0]?.threshold.min).toBe(1);

		expect(withoutGroupOrder.groupId).toBe(groupWithParent.id);
		expect(withoutGroupOrder.groupOrder).toBeNull();
		expect(withoutGroupOrder.resolvedGroupOrder).toBe(1);
		expect(withoutGroupOrder.displayAsPercent).toBe(true);
		expect(withoutGroupOrder.lowerBound).toBe(-2);

		expect(withoutGroup.groupId).toBeNull();
		expect(withoutGroup.globalCost).toEqual({ amount: 6 });
		expect(registry.resources.byId[withoutGroup.id]).toBe(withoutGroup);
		expect(Object.isFrozen(registry.resources.ordered)).toBe(true);
		expect(Object.isFrozen(registry.resources.byId)).toBe(true);
	});

	it('rejects content that references missing groups or duplicate identifiers', () => {
		const group = resourceV2GroupDefinition({ id: 'group-alpha' });
		const firstResource = resourceV2Definition({
			id: 'resource-alpha',
			metadata: { group: { id: group.id } },
		});

		const duplicateGroup = {
			...group,
		} satisfies ContentResourceGroupDefinition;
		const duplicateResource = {
			...firstResource,
			groupId: 'missing-group',
		} satisfies ContentResourceDefinition;

		expect(() =>
			createRuntimeResourceCatalog({
				groups: toRegistry([group, duplicateGroup]),
				resources: toRegistry([firstResource]),
			}),
		).toThrow(/duplicate group id/i);

		expect(() =>
			createRuntimeResourceCatalog({
				groups: toRegistry([group]),
				resources: toRegistry([firstResource, duplicateResource]),
			}),
		).toThrow(/references missing group/i);

		expect(() =>
			createRuntimeResourceCatalog({
				groups: toRegistry([group]),
				resources: toRegistry([firstResource, { ...firstResource }]),
			}),
		).toThrow(/duplicate resource id/i);
	});

	it('rejects invalid numeric configuration', () => {
		const group = resourceV2GroupDefinition({ id: 'group-beta' });
		const resource = resourceV2Definition({
			id: 'resource-beta',
			metadata: { group: { id: group.id } },
		});

		const nonIntegerGroupOrder = {
			...group,
			order: 1.5,
		} satisfies ContentResourceGroupDefinition;

		expect(() =>
			createRuntimeResourceCatalog({
				groups: toRegistry([nonIntegerGroupOrder]),
				resources: toRegistry([resource]),
			}),
		).toThrow(/order to be an integer/i);

		const nonIntegerResourceOrder = {
			...resource,
			order: 2.25,
		} satisfies ContentResourceDefinition;

		expect(() =>
			createRuntimeResourceCatalog({
				groups: toRegistry([group]),
				resources: toRegistry([nonIntegerResourceOrder]),
			}),
		).toThrow(/order to be an integer/i);

		const invalidBounds = {
			...resource,
			lowerBound: 0.5,
		} satisfies ContentResourceDefinition;

		expect(() =>
			createRuntimeResourceCatalog({
				groups: toRegistry([group]),
				resources: toRegistry([invalidBounds]),
			}),
		).toThrow(/lowerBound to be an integer/i);

		const invalidTier = resourceV2Definition({
			id: 'resource-with-tier',
			metadata: { group: { id: group.id } },
			tierTrack: {
				metadata: {
					id: 'resource-tier-track',
					label: 'Resource Tier Track',
				},
				tiers: [
					{
						id: 'tier-invalid',
						label: 'Tier Invalid',
						threshold: { min: 1, max: 2.5 },
					},
				],
			},
		});

		expect(() =>
			createRuntimeResourceCatalog({
				groups: toRegistry([group]),
				resources: toRegistry([invalidTier]),
			}),
		).toThrow(/tier\.threshold\.max to be an integer/i);

		const invalidGlobalCost = {
			...resource,
			globalCost: { amount: 0 },
		} satisfies ContentResourceDefinition;

		expect(() =>
			createRuntimeResourceCatalog({
				groups: toRegistry([group]),
				resources: toRegistry([invalidGlobalCost]),
			}),
		).toThrow(/greater than 0/i);
	});

	it('rejects unsupported reconciliation modes and inconsistent grouping', () => {
		const group = resourceV2GroupDefinition({ id: 'group-gamma' });
		const resource = resourceV2Definition({ id: 'resource-gamma' });

		const invalidGroup = {
			...group,
			parent: {
				...group.parent!,
				reconciliation: 'pass',
			},
		} satisfies ContentResourceGroupDefinition;

		expect(() =>
			createRuntimeResourceCatalog({
				groups: toRegistry([invalidGroup]),
				resources: toRegistry([resource]),
			}),
		).toThrow(/only supports clamp reconciliation/i);

		const invalidResource = {
			...resource,
			reconciliation: 'reject',
		} satisfies ContentResourceDefinition;

		expect(() =>
			createRuntimeResourceCatalog({
				groups: toRegistry([group]),
				resources: toRegistry([invalidResource]),
			}),
		).toThrow(/only supports clamp reconciliation/i);

		const groupOrderWithoutGroup = {
			...resource,
			groupId: undefined,
			groupOrder: 1,
		} satisfies ContentResourceDefinition;

		expect(() =>
			createRuntimeResourceCatalog({
				groups: toRegistry([group]),
				resources: toRegistry([groupOrderWithoutGroup]),
			}),
		).toThrow(/groupOrder without groupId/i);

		expect(() =>
			createRuntimeResourceCatalog({
				groups: toRegistry([group]),
				resources: toRegistry([
					{
						...resource,
						globalCost: { amount: 2 },
					},
					{
						...resource,
						id: 'resource-gamma-2',
						globalCost: { amount: 3 },
					},
				]),
			}),
		).toThrow(/only supports a single global cost resource/i);
	});
});
