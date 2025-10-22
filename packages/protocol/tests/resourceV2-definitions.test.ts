import { describe, expect, it, expectTypeOf } from 'vitest';
import { ZodError, type infer as ZodInfer } from 'zod';

import {
	resourceV2DefinitionCollectionSchema,
	resourceV2TierTrackSchema,
	resourceV2ValueEffectSchema,
} from '../src';
import type {
	ResourceV2DefinitionCollection,
	ResourceV2TierTrack,
	ResourceV2ValueEffectDefinition,
} from '../src';

describe('resourceV2 schemas', () => {
	it('matches exported types', () => {
		expectTypeOf<ResourceV2TierTrack>().toEqualTypeOf<
			ZodInfer<typeof resourceV2TierTrackSchema>
		>();
		expectTypeOf<ResourceV2ValueEffectDefinition>().toEqualTypeOf<
			ZodInfer<typeof resourceV2ValueEffectSchema>
		>();
		expectTypeOf<ResourceV2DefinitionCollection>().toEqualTypeOf<
			ZodInfer<typeof resourceV2DefinitionCollectionSchema>
		>();
	});

	it('accepts ResourceV2 definition collections with unique tier steps', () => {
		const collection: ResourceV2DefinitionCollection = {
			definitions: [
				{
					id: 'absorption',
					display: {
						icon: 'icon-absorption',
						label: 'Absorption',
						description: 'Tracks defensive warding energy.',
						order: 1,
					},
					bounds: { lowerBound: 0, upperBound: 10 },
					tierTrack: {
						id: 'absorption-tier-track',
						steps: [
							{
								id: 'absorption-tier-1',
								min: 0,
								max: 4,
							},
							{
								id: 'absorption-tier-2',
								min: 5,
							},
						],
					},
					group: {
						groupId: 'warding',
						order: 0,
						parent: {
							id: 'warding-parent',
							icon: 'icon-warding-parent',
							label: 'Warding',
							description: 'Aggregates warding pool totals.',
							order: 0,
							limited: true,
						},
					},
				},
			],
			groups: [
				{
					id: 'warding',
					parent: {
						id: 'warding-parent',
						icon: 'icon-warding-parent',
						label: 'Warding',
						description: 'Aggregates warding pool totals.',
						order: 0,
						limited: true,
					},
				},
			],
			limitedParentIds: ['warding-parent'],
		};

		expect(resourceV2DefinitionCollectionSchema.parse(collection)).toEqual(
			collection,
		);
	});

	it('rejects duplicate tier ids within a track', () => {
		const duplicateTierTrack: ResourceV2TierTrack = {
			id: 'absorption-tier-track',
			steps: [
				{ id: 'absorption-tier-1', min: 0 },
				{ id: 'absorption-tier-1', min: 5 },
			],
		};

		expect(() => resourceV2TierTrackSchema.parse(duplicateTierTrack)).toThrow(
			/duplicate step ids/,
		);
	});

	it('rejects unsupported reconciliation strategies', () => {
		const effect: ResourceV2ValueEffectDefinition = {
			kind: 'resource:add',
			resourceId: 'absorption',
			amount: 5,
			// @ts-expect-error – rejecting unsupported reconciliation values
			reconciliation: 'reject',
		};

		let thrown: unknown;
		try {
			resourceV2ValueEffectSchema.parse(effect);
		} catch (error) {
			thrown = error;
		}

		expect(thrown).toBeInstanceOf(ZodError);
		if (thrown instanceof ZodError) {
			expect(thrown.issues[0]?.path).toEqual(['reconciliation']);
			expect(thrown.issues[0]?.message.toLowerCase()).toContain('clamp');
		}
	});

	it('requires limited parent flags for every parent id', () => {
		const collection: ResourceV2DefinitionCollection = {
			definitions: [
				{
					id: 'absorption',
					display: {
						icon: 'icon-absorption',
						label: 'Absorption',
						description: 'Tracks defensive warding energy.',
						order: 1,
					},
					group: {
						groupId: 'warding',
						order: 0,
						parent: {
							id: 'warding-parent',
							icon: 'icon-warding-parent',
							label: 'Warding',
							description: 'Aggregates warding pool totals.',
							order: 0,
							limited: true,
						},
					},
				},
			],
			limitedParentIds: [],
		};

		expect(() =>
			resourceV2DefinitionCollectionSchema.parse(collection),
		).toThrow(/Missing limited parent flag/);
	});
});
