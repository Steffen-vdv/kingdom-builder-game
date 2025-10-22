import { describe, expect, it } from 'vitest';

import {
	resourceV2Add,
	resourceV2Transfer,
	resourceV2UpperBoundIncrease,
} from '@kingdom-builder/contents';
import {
	resourceV2DefinitionSchema,
	resourceV2GroupDefinitionSchema,
	resourceV2ReconciliationSchema,
	resourceV2TierTrackSchema,
} from '@kingdom-builder/protocol';

import { createContentFactory } from '../factories/content';

describe('content factory – ResourceV2 helpers', () => {
	it('creates resource definitions that satisfy the protocol schema', () => {
		const factory = createContentFactory();
		const group = factory.resourceGroup({
			id: 'absorption-group',
			parentId: 'absorption-parent',
			parentLabel: 'Absorption Pool',
			parentDescription: 'Virtual parent for Absorption rollup tests.',
			parentIcon: 'icon-resource-absorption-parent',
			parentOrder: 0,
		});
		const tierTrack = factory.resourceTierTrack({
			id: 'absorption-track',
			steps: [
				{ id: 'tier-1', min: 0, max: 9 },
				{ id: 'tier-2', min: 10 },
			],
			display: {
				title: 'Absorption Momentum',
				summaryToken: 'absorption-tier',
			},
		});

		const definition = factory.resourceDefinition({
			id: 'absorption',
			icon: 'icon-resource-absorption',
			label: 'Absorption',
			description: 'Absorption pilot resource used by migration tests.',
			order: 1,
			configure: (builder) => {
				builder
					.lowerBound(0)
					.upperBound(100)
					.trackValueBreakdown()
					.trackBoundBreakdown()
					.tierTrack(tierTrack)
					.group(group.id, group.parent.order + 1, (metadata) => {
						metadata.parent(group.parent);
					})
					.globalActionCost(1);
			},
		});

		expect(() => resourceV2GroupDefinitionSchema.parse(group)).not.toThrow();
		expect(() => resourceV2TierTrackSchema.parse(tierTrack)).not.toThrow();
		expect(() => resourceV2DefinitionSchema.parse(definition)).not.toThrow();
	});

	it('enforces clamp-only reconciliation on ResourceV2 effect builders', () => {
		const factory = createContentFactory();
		const definition = factory.resourceDefinition({ id: 'clamp-resource' });

		const add = resourceV2Add({
			resourceId: definition.id,
			amount: 5,
		});
		const transfer = resourceV2Transfer({
			donor: { resourceId: definition.id },
			recipient: { resourceId: definition.id },
			amount: 2,
		});
		const upperBoundIncrease = resourceV2UpperBoundIncrease({
			resourceId: definition.id,
			amount: 3,
		});

		expect(resourceV2ReconciliationSchema.parse(add.reconciliation)).toBe(
			'clamp',
		);
		expect(
			resourceV2ReconciliationSchema.parse(transfer.donor.reconciliation),
		).toBe('clamp');
		expect(
			resourceV2ReconciliationSchema.parse(transfer.recipient.reconciliation),
		).toBe('clamp');
		expect(
			resourceV2ReconciliationSchema.parse(upperBoundIncrease.reconciliation),
		).toBe('clamp');

		expect(() =>
			resourceV2Add({
				resourceId: definition.id,
				amount: 1,
				reconciliation: 'overdraft' as never,
			}),
		).toThrowError(/clamp/i);
	});
});
