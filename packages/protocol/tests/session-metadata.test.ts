import { describe, expect, it, expectTypeOf } from 'vitest';
import { sessionCreateResponseSchema } from '../src';
import type {
	SessionMetadataDescriptor,
	SessionMetadataFormat,
	SessionOverviewMetadata,
	SessionSnapshot,
	SessionSnapshotMetadata,
} from '../src/session';
import type { SessionResourceMetadataSnapshot } from '../src/session/resourceV2';

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
		const descriptor = {
			key: 'morale',
			icon: 'morale-icon',
			label: 'Morale',
			description: 'Track overall morale.',
			order: 1,
			percent: true,
		};
		const resources: SessionResourceMetadataSnapshot = {
			values: {
				morale: {
					descriptor,
				},
			},
			groups: {},
			tiers: {},
			orderedDisplay: [
				{
					type: 'value',
					key: 'morale',
					descriptor,
				},
			],
			recentGains: [],
		};
		const metadata: SessionSnapshotMetadata = {
			passiveEvaluationModifiers: {},
			overview,
			values: {
				morale: {
					label: 'Morale',
					displayAsPercent: true,
					format: 'percent',
				},
			},
			resources,
		};
		const response = {
			sessionId: 'session-123',
			snapshot: { metadata } as unknown as SessionSnapshot,
			registries: {
				actions: {},
				buildings: {},
				developments: {},
				populations: {},
				resources: { definitions: {}, groups: {} },
			},
		};
		const result = sessionCreateResponseSchema.parse(response);
		const parsedMetadata = (
			result.snapshot as { metadata: SessionSnapshotMetadata }
		).metadata;
		expect(parsedMetadata.overview?.hero?.title).toBe('Realm Guide');
		expect(parsedMetadata.values?.morale?.displayAsPercent).toBe(true);
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
