import { describe, expect, it, expectTypeOf } from 'vitest';
import { sessionCreateResponseSchema } from '../src';
import type {
	SessionMetadataDescriptor,
	SessionMetadataFormat,
	SessionOverviewMetadata,
	SessionSnapshot,
	SessionSnapshotMetadata,
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
		const metadata: SessionSnapshotMetadata = {
			passiveEvaluationModifiers: {},
			overview,
			values: {
				descriptors: {
					morale: {
						id: 'morale',
						label: 'Morale',
						order: 1,
						percent: true,
					},
				},
				recentGains: [
					{
						resourceId: 'morale',
						amount: 2,
					},
				],
			},
		};
		const response = {
			sessionId: 'session-123',
			snapshot: { metadata } as unknown as SessionSnapshot,
			registries: {
				actions: {},
				buildings: {},
				developments: {},
				values: {},
				resourceGroups: {},
				globalActionCost: null,
			},
		};
		const result = sessionCreateResponseSchema.parse(response);
		const parsedMetadata = (
			result.snapshot as { metadata: SessionSnapshotMetadata }
		).metadata;
		expect(parsedMetadata.overview?.hero?.title).toBe('Realm Guide');
		expect(parsedMetadata.values?.descriptors.morale?.percent).toBe(true);
		expect(parsedMetadata.values?.recentGains?.[0]?.amount).toBe(2);
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
