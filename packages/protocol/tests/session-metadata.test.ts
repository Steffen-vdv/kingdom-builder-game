import { describe, expect, it, expectTypeOf } from 'vitest';
import { sessionCreateResponseSchema } from '../src';
import type {
	SessionMetadataDescriptor,
	SessionMetadataFormat,
	SessionOverviewMetadata,
	SessionSnapshot,
	SessionSnapshotMetadata,
	SessionResourceValueMetadata,
} from '../src/session';

describe('session snapshot metadata', () => {
	it('parses overview metadata snapshots', () => {
		const overview: SessionOverviewMetadata = {
			hero: {
				badgeIcon: '👑',
				badgeLabel: 'Monarch',
				title: 'Realm Guide',
				intro: 'Welcome to the realm.',
				paragraph: 'Chart the future with {game}.',
				tokens: { game: 'game', duel: 'duel' },
			},
			sections: [
				{
					kind: 'paragraph',
					id: 'intro',
					icon: 'game',
					title: 'Introduction',
					paragraphs: ['Lead the {game} forces.'],
				},
				{
					kind: 'list',
					id: 'steps',
					icon: 'duel',
					title: 'Steps',
					items: [
						{
							icon: 'expand',
							label: 'Plan',
							body: ['Spend {gold}.'],
						},
					],
				},
			],
			tokens: {
				actions: { expand: ['expand'] },
				static: { game: ['game'] },
			},
		};
		const values: SessionResourceValueMetadata = {
			descriptors: {
				focus: {
					id: 'focus',
					icon: 'focus',
					label: 'Focus',
					description: 'Focus on growth.',
					order: 1,
					percent: true,
				},
			},
			groups: {
				council: {
					id: 'council',
					order: 1,
					parentId: 'council-parent',
					parent: {
						id: 'council-parent',
						icon: 'crown',
						label: 'Council',
						description: 'Council parent.',
						order: 0,
						limited: true,
					},
					children: ['focus'],
				},
			},
			tiers: {
				focus: {
					track: {
						id: 'focus-track',
						steps: [
							{
								id: 'focus-tier',
								min: 0,
								max: 10,
								index: 0,
							},
						],
					},
					currentStepId: 'focus-tier',
					currentStepIndex: 0,
				},
			},
			globalActionCost: { resourceId: 'focus', amount: 2 },
		};
		const metadata: SessionSnapshotMetadata = {
			passiveEvaluationModifiers: {},
			overview,
			values,
		};
		const response = {
			sessionId: 'session-123',
			snapshot: { metadata } as unknown as SessionSnapshot,
			registries: {
				actions: {},
				buildings: {},
				developments: {},
				populations: {},
				values: {
					values: {},
					groups: {},
				},
			},
		};
		const result = sessionCreateResponseSchema.parse(response);
		const parsedMetadata = (
			result.snapshot as { metadata: SessionSnapshotMetadata }
		).metadata;
		expect(parsedMetadata.overview?.hero?.title).toBe('Realm Guide');
		expect(parsedMetadata.values?.descriptors.focus.percent).toBe(true);
		expect(parsedMetadata.values?.tiers?.focus.currentStepId).toBe(
			'focus-tier',
		);
		expect(parsedMetadata.values?.globalActionCost?.amount).toBe(2);
	});

	it('exposes descriptor format typing', () => {
		expectTypeOf<SessionMetadataDescriptor['displayAsPercent']>().toEqualTypeOf<
			boolean | undefined
		>();
		expectTypeOf<SessionMetadataDescriptor['format']>().toEqualTypeOf<
			SessionMetadataFormat | undefined
		>();
	});
});
