import { describe, expect, it, expectTypeOf } from 'vitest';
import { sessionCreateResponseSchema } from '../src';
import {
	createResourceV2GroupParentEntry,
	createResourceV2ValueEntry,
	flattenResourceV2OrderedBlocks,
	isResourceV2GroupParentEntry,
} from '../src/session';
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
					absorption: {
						descriptor: {
							label: 'Absorption',
							icon: 'absorb',
							description: 'Pilot track for value metadata tests.',
							order: 1,
						},
						tier: {
							trackId: 'absorption-track',
							activeStepId: 'tier-1',
							steps: [
								{
									id: 'tier-1',
									min: 0,
									max: 10,
									active: true,
									display: {
										label: 'Settled',
									},
								},
							],
						},
					},
				},
				groups: [
					{
						groupId: 'happiness',
						parent: {
							id: 'happiness-parent',
							label: 'Happiness',
							icon: 'happy',
							description: 'Aggregate mood across the realm.',
							order: 0,
							percent: true,
							limited: true,
						},
						children: ['joy'],
					},
				],
				orderedValues: [
					{
						kind: 'group-parent',
						resourceId: 'happiness-parent',
						groupId: 'happiness',
						descriptor: {
							id: 'happiness-parent',
							label: 'Happiness',
							icon: 'happy',
							description: 'Aggregate mood across the realm.',
							order: 0,
							percent: true,
							limited: true,
						},
						children: ['joy'],
					},
					{
						kind: 'value',
						resourceId: 'absorption',
						descriptor: {
							label: 'Absorption',
							icon: 'absorb',
							description: 'Pilot track for value metadata tests.',
							order: 1,
						},
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
				populations: {},
				resources: {},
				resourceGroups: {},
				globalActionCostResourceId: null,
			},
		};
		const result = sessionCreateResponseSchema.parse(response);
		const parsedMetadata = (
			result.snapshot as { metadata: SessionSnapshotMetadata }
		).metadata;
		expect(parsedMetadata.overview?.hero?.title).toBe('Realm Guide');
		expect(parsedMetadata.values?.descriptors.absorption.descriptor.label).toBe(
			'Absorption',
		);
		expect(parsedMetadata.values?.groups?.[0].parent.limited).toBe(true);
	});

	it('exposes descriptor format typing', () => {
		expectTypeOf<SessionMetadataDescriptor['displayAsPercent']>().toEqualTypeOf<
			boolean | undefined
		>();
		expectTypeOf<SessionMetadataDescriptor['format']>().toEqualTypeOf<
			SessionMetadataFormat | undefined
		>();
	});

	it('builds ordered ResourceV2 display entries', () => {
		const parent = createResourceV2GroupParentEntry(
			'order-group',
			{
				id: 'parent-id',
				label: 'Parent',
				icon: 'parent-icon',
				description: 'Resource group parent entry.',
				order: 1,
				percent: false,
				limited: true,
			},
			['child-id'],
		);
		const child = createResourceV2ValueEntry('child-id', {
			label: 'Child',
			icon: 'child-icon',
			description: 'Resource group child entry.',
			order: 2,
		});

		expect(isResourceV2GroupParentEntry(parent)).toBe(true);

		const flattened = flattenResourceV2OrderedBlocks([
			{ order: 2, entries: [child] },
			{ order: 1, entries: [parent] },
		]);

		expect(flattened).toHaveLength(2);
		expect(flattened[0]).toMatchObject({
			kind: 'group-parent',
			groupId: 'order-group',
		});
		expect(flattened[1]).toMatchObject({
			kind: 'value',
			resourceId: 'child-id',
		});
	});
});
