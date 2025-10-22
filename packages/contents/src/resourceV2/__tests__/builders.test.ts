import { describe, expect, it } from 'vitest';

import {
	ResourceV2PercentRoundingMode,
	ResourceV2Reconciliation,
	adjustResourceV2LowerBound,
	createResourceV2Builder,
	createResourceV2GroupMetadata,
	createResourceV2TierTrackBuilder,
	createResourceV2VirtualParentBuilder,
	flatDelta,
	percentDelta,
	resourceV2Add,
	resourceV2Remove,
	resourceV2Transfer,
} from '../builders';

import type { ResourceV2Definition } from '../types';

describe('ResourceV2 builders', () => {
	const parentId = 'resource-v2-parent';
	const resourceId = 'resource-v2-primary';
	const groupId = 'resource-v2-group';
	const tierTrackId = 'resource-v2-track';
	const tierStepId = 'resource-v2-tier-1';

	const buildParent = () =>
		createResourceV2VirtualParentBuilder()
			.id(parentId)
			.name('Parent Resource')
			.build();

	const buildResource = () =>
		createResourceV2Builder()
			.id(resourceId)
			.name('Resource Name')
			.group(createResourceV2GroupMetadata(groupId, buildParent(), 1))
			.tierTrack(
				createResourceV2TierTrackBuilder()
					.id(tierTrackId)
					.name('Track Name')
					.step({
						id: tierStepId,
						minimum: 0,
					})
					.build(),
			)
			.build();

	it('builds a resource with tiering, group metadata, and limited flag', () => {
		const resource = buildResource();

		expect(resource).toEqual<ResourceV2Definition>({
			id: resourceId,
			name: 'Resource Name',
			group: {
				groupId: groupId,
				order: 1,
				parent: {
					id: parentId,
					name: 'Parent Resource',
				},
			},
			tierTrack: {
				id: tierTrackId,
				name: 'Track Name',
				steps: [
					{
						id: tierStepId,
						minimum: 0,
					},
				],
			},
			limitedToChildren: true,
		});
	});

	it('prevents duplicate tier tracks per resource', () => {
		const builder = createResourceV2Builder()
			.id('resource-v2-base')
			.name('Resource V2 Base');
		builder.tierTrack(
			createResourceV2TierTrackBuilder()
				.id('resource-v2-track-a')
				.name('Track A')
				.step({ id: 'resource-v2-tier-a', minimum: 0 })
				.build(),
		);

		expect(() =>
			builder.tierTrack(
				createResourceV2TierTrackBuilder()
					.id('resource-v2-track-b')
					.name('Track B')
					.step({ id: 'resource-v2-tier-b', minimum: 1 })
					.build(),
			),
		).toThrowError(/only supports one tier track/i);
	});

	it('rejects unsupported reconciliation strategies', () => {
		const resource = buildResource();
		expect(() =>
			resourceV2Add(resource, flatDelta(5), {
				reconciliation: 'pass' as ResourceV2Reconciliation,
			}),
		).toThrowError(/only expose clamp reconciliation/i);
	});

	it('rejects value mutations targeting limited virtual parents', () => {
		const resource = buildResource();
		expect(() =>
			resourceV2Remove(
				{
					id: resource.group?.parent.id ?? 'resource-v2-parent',
					limitedToChildren: true,
				},
				flatDelta(1),
			),
		).toThrowError(/cannot target limited virtual parents/i);
	});

	it('rejects lower-bound decreases during MVP scope', () => {
		const resource = buildResource();
		expect(() =>
			adjustResourceV2LowerBound(resource, 1, 'decrease'),
		).toThrowError(/decrease/);
	});

	it('includes hook suppression flag only when requested', () => {
		const unrestricted = createResourceV2Builder()
			.id('resource-v2-child')
			.name('Child Resource')
			.build();
		const withoutSuppression = resourceV2Add(unrestricted, flatDelta(2));
		const withSuppression = resourceV2Remove(
			unrestricted,
			percentDelta(10, ResourceV2PercentRoundingMode.Nearest),
			{
				suppressHooks: true,
			},
		);

		expect(withoutSuppression).not.toHaveProperty('suppressHooks');
		expect(withSuppression).toMatchObject({ suppressHooks: true });
	});

	it('builds transfers with clamp reconciliation and optional hook suppression', () => {
		const resource = createResourceV2Builder()
			.id('resource-v2-source')
			.name('Source Resource')
			.build();
		const other = createResourceV2Builder()
			.id('resource-v2-target')
			.name('Target Resource')
			.build();

		const transfer = resourceV2Transfer(resource, other, 3, {
			suppressHooks: true,
		});

		expect(transfer).toEqual({
			kind: 'transfer',
			fromResourceId: 'resource-v2-source',
			toResourceId: 'resource-v2-target',
			amount: 3,
			donorReconciliation: ResourceV2Reconciliation.Clamp,
			recipientReconciliation: ResourceV2Reconciliation.Clamp,
			suppressHooks: true,
		});
	});
});
