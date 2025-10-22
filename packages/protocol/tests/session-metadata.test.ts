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
			valueDescriptors: {
				morale: {
					id: 'morale',
					key: 'morale',
					order: 1,
					label: 'Morale',
					percent: true,
				},
			},
			valueGroups: {
				morale: {
					id: 'morale-group',
					order: 1,
					parent: {
						id: 'morale-parent',
						order: 0,
						label: 'Morale',
						limited: true,
					},
					values: ['morale'],
				},
			},
			valueTiers: {
				morale: {
					trackId: 'morale-track',
					current: { id: 'steady', label: 'Steady' },
				},
			},
		};
		const response = {
			sessionId: 'session-123',
			snapshot: { metadata } as unknown as SessionSnapshot,
			registries: {
				actions: {},
				buildings: {},
				developments: {},
				populations: {},
				values: {},
				valueGroups: {},
				globalActionCost: null,
			},
		};
		const result = sessionCreateResponseSchema.parse(response);
		const parsedMetadata = (
			result.snapshot as { metadata: SessionSnapshotMetadata }
		).metadata;
		expect(parsedMetadata.overview?.hero?.title).toBe('Realm Guide');
		expect(parsedMetadata.valueDescriptors?.morale.percent).toBe(true);
		expect(parsedMetadata.valueGroups?.morale.parent.label).toBe('Morale');
		expect(parsedMetadata.valueTiers?.morale.current.id).toBe('steady');
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
