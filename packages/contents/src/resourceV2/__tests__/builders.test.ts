import { describe, expect, it } from 'vitest';
import {
	resourceV2,
	resourceV2Add,
	resourceV2Group,
	resourceV2LowerBoundDecrease,
	resourceV2TierTrack,
	ResourceV2Reconciliation,
	ResourceV2RoundingMode,
} from '../index';

describe('ResourceV2 builders', () => {
	it('builds a resource definition with a single tier track', () => {
		const tierTrack = resourceV2TierTrack('happiness_tiers')
			.displayName('Happiness Levels')
			.step({
				id: 'joyful',
				minimum: 10,
				enterEffects: [],
			})
			.build();

		const definition = resourceV2('happiness')
			.display({
				name: 'Happiness',
				icon: '😊',
				description: 'How content our citizens feel.',
			})
			.bounds({ lower: -10, upper: 10 })
			.tracking({ trackValueBreakdown: true })
			.group('mood', 1)
			.tierTrack(tierTrack)
			.build();

		expect(definition).toMatchObject({
			id: 'happiness',
			display: {
				name: 'Happiness',
				icon: '😊',
				description: 'How content our citizens feel.',
			},
			bounds: { lower: -10, upper: 10 },
			tracking: { trackValueBreakdown: true },
			tierTrack,
			groupId: 'mood',
			groupOrder: 1,
		});
	});

	it('throws when tier track configured multiple times', () => {
		const builder = resourceV2('absorption');
		builder.tierTrack(
			resourceV2TierTrack('absorption_tiers')
				.step({ id: 'baseline', minimum: 0 })
				.build(),
		);
		expect(() =>
			builder.tierTrack(
				resourceV2TierTrack('another')
					.step({ id: 'extra', minimum: 10 })
					.build(),
			),
		).toThrowError('ResourceV2 definitions support only one tierTrack');
	});

	it('surfaces hook suppression and enforces clamp reconciliation', () => {
		expect(
			resourceV2Add('gold', 5, {
				round: ResourceV2RoundingMode.Nearest,
				suppressHooks: true,
			}),
		).toMatchObject({
			type: 'resourceV2',
			method: 'add',
			params: { resourceId: 'gold', amount: 5 },
			round: ResourceV2RoundingMode.Nearest,
			reconciliation: ResourceV2Reconciliation.Clamp,
			suppressHooks: true,
		});

		expect(() =>
			resourceV2Add('gold', 3, {
				reconciliation: 'reject' as ResourceV2Reconciliation,
			}),
		).toThrowError('ResourceV2 MVP rollout');
	});

	it('prevents lower-bound decrease definitions', () => {
		expect(() => resourceV2LowerBoundDecrease()).toThrowError('unavailable');
	});

	it('rejects value mutations targeting virtual parents', () => {
		expect(() =>
			resourceV2Add('population_parent', 2, { target: 'virtualParent' }),
		).toThrowError('Virtual parent resources are limited');
	});
});

describe('ResourceV2 group builder', () => {
	it('builds a group with a virtual parent once', () => {
		const group = resourceV2Group('population')
			.order(0)
			.parent({
				id: 'population_total',
				name: 'Population',
				icon: '👥',
				description: 'Total assigned roles.',
			})
			.build();

		expect(group).toMatchObject({
			id: 'population',
			order: 0,
			parent: {
				id: 'population_total',
				name: 'Population',
				icon: '👥',
				description: 'Total assigned roles.',
			},
		});

		expect(() =>
			resourceV2Group('population')
				.parent({
					id: 'parent_a',
					name: 'A',
					icon: 'A',
					description: 'First parent.',
				})
				.parent({
					id: 'parent_b',
					name: 'B',
					icon: 'B',
					description: 'Second parent.',
				}),
		).toThrowError('only one virtual parent');
	});
});
