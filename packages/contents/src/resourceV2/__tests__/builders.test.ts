import { describe, expect, it } from 'vitest';

import {
	resourceV2,
	resourceV2TierTrack,
	resourceV2Add,
	resourceV2LowerBoundDecrease,
	resourceV2Remove,
	resourceV2Transfer,
	resourceV2UpperBoundIncrease,
} from '../builders';

import {
	ResourceV2ReconciliationStrategy,
	type ResourceV2Definition,
	type ResourceV2TransferEffectDefinition,
	type ResourceV2ValueEffectDefinition,
} from '../types';

describe('ResourceV2 builders', () => {
	it('builds a resource definition with tier track and group parent', () => {
		const tierTrack = resourceV2TierTrack('absorption-tiers')
			.display({ title: 'Absorption Tiers' })
			.step({
				id: 'baseline',
				min: 0,
				max: 10,
				display: { label: 'Baseline' },
			})
			.step({
				id: 'surge',
				min: 10,
				display: { label: 'Surge' },
				enterEffects: ['effect:apply-surge'],
			})
			.build();

		const definition: ResourceV2Definition = resourceV2('absorption')
			.icon('🌀')
			.label('Absorption')
			.description('Pilot track for the ResourceV2 migration tests.')
			.order(3)
			.percent()
			.lowerBound(0)
			.upperBound(20)
			.trackValueBreakdown()
			.trackBoundBreakdown()
			.tierTrack(tierTrack)
			.group('elemental', 1, (group) => {
				group.parent({
					id: 'elemental-total',
					icon: 'Σ',
					label: 'Elemental Total',
					description: 'Computed aggregate for elemental tracks.',
					order: 0,
				});
			})
			.build();

		expect(definition).toMatchObject({
			id: 'absorption',
			display: {
				icon: '🌀',
				label: 'Absorption',
				description: 'Pilot track for the ResourceV2 migration tests.',
				order: 3,
				percent: true,
			},
			bounds: { lowerBound: 0, upperBound: 20 },
			trackValueBreakdown: true,
			trackBoundBreakdown: true,
			tierTrack,
			group: {
				groupId: 'elemental',
				order: 1,
				parent: {
					id: 'elemental-total',
					limited: true,
				},
			},
		});
	});

	it('prevents configuring more than one tier track', () => {
		const builder = resourceV2('absorption');
		builder.tierTrack(
			resourceV2TierTrack('first').step({ id: 'one', min: 0 }).build(),
		);

		expect(() =>
			builder.tierTrack(
				resourceV2TierTrack('second').step({ id: 'two', min: 5 }).build(),
			),
		).toThrowError('single tier track');
	});

	it('surfaces hook suppression flags through effect helpers', () => {
		const addEffect: ResourceV2ValueEffectDefinition = resourceV2Add({
			resourceId: 'absorption',
			amount: 2,
			suppressHooks: true,
		});
		const removeEffect: ResourceV2ValueEffectDefinition = resourceV2Remove({
			resourceId: 'absorption',
			amount: 1,
		});

		expect(addEffect.suppressHooks).toBe(true);
		expect(removeEffect.suppressHooks).toBeUndefined();
	});

	it('restricts reconciliation options to clamp', () => {
		expect(() =>
			resourceV2Add({
				resourceId: 'absorption',
				amount: 5,
				reconciliation: 'reject' as unknown as ResourceV2ReconciliationStrategy,
			}),
		).toThrowError('clamp reconciliation');

		const transfer: ResourceV2TransferEffectDefinition = resourceV2Transfer({
			amount: 3,
			donor: { resourceId: 'absorption' },
			recipient: { resourceId: 'focus' },
		});

		expect(transfer.donor.reconciliation).toBe(
			ResourceV2ReconciliationStrategy.Clamp,
		);
		expect(transfer.recipient.reconciliation).toBe(
			ResourceV2ReconciliationStrategy.Clamp,
		);
	});

	it('blocks unsupported lower-bound decreases while allowing upper-bound increases', () => {
		expect(() => resourceV2LowerBoundDecrease()).toThrowError(
			'lower-bound decrease',
		);

		expect(() =>
			resourceV2UpperBoundIncrease({
				resourceId: 'absorption',
				amount: 5,
			}),
		).not.toThrow();
	});

	it('treats virtual parents as limited resources', () => {
		expect(() =>
			resourceV2('absorption').group('elemental', 1, (group) => {
				group.parent({
					id: 'elemental-total',
					icon: 'Σ',
					label: 'Elemental Total',
					description: 'Computed aggregate for elemental tracks.',
					order: 0,
					limited: false,
				});
			}),
		).toThrowError('limited resources');
	});
});
