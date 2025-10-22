import { describe, expect, it, expectTypeOf } from 'vitest';
import type { infer as ZodInfer } from 'zod';

import {
	resourceV2BoundsMetadataSchema,
	resourceV2DefinitionSchema,
	resourceV2GlobalActionCostMetadataSchema,
	resourceV2GroupDefinitionSchema,
	resourceV2RecentGainEntrySchema,
	resourceV2RegistryPayloadSchema,
	resourceV2TierDefinitionSchema,
	resourceV2TierTrackDefinitionSchema,
} from '../src';
import type {
	ResourceV2Definition,
	ResourceV2GroupDefinition,
	ResourceV2RecentGainEntry,
	ResourceV2TierDefinition,
	ResourceV2TierTrackDefinition,
} from '../src';

const sampleTierDefinition: ResourceV2TierDefinition = {
	id: 'steady',
	range: { min: 0, max: 10 },
	enterEffects: [
		{
			type: 'resource',
			method: 'add',
			params: { id: 'absorption', amount: 1 },
		},
	],
	display: {
		title: 'Steady',
		summary: 'Holding steady.',
	},
};

const sampleTierTrack: ResourceV2TierTrackDefinition = {
	id: 'absorption-track',
	tiers: [sampleTierDefinition, { id: 'high', range: { min: 10 } }],
};

const sampleGroup: ResourceV2GroupDefinition = {
	id: 'population',
	order: 1,
	parent: {
		id: 'population-total',
		display: {
			name: 'Population',
			order: 0,
		},
		relation: 'sumOfAll',
		trackValueBreakdown: true,
		bounds: { lowerBound: 0 },
	},
	children: ['absorption'],
};

const sampleDefinition: ResourceV2Definition = {
	id: 'absorption',
	display: {
		name: 'Absorption',
		order: 1,
		description: 'Damage absorption capacity for the castle.',
		displayAsPercent: true,
	},
	bounds: { lowerBound: 0, upperBound: 100 },
	trackValueBreakdown: true,
	trackBoundBreakdown: true,
	tierTrack: sampleTierTrack,
	group: { groupId: 'population', order: 1 },
	globalActionCost: { amount: 1 },
};

describe('resourceV2 schemas', () => {
	it('aligns types with schemas', () => {
		expectTypeOf<ResourceV2Definition>().toEqualTypeOf<
			ZodInfer<typeof resourceV2DefinitionSchema>
		>();
		expectTypeOf<ResourceV2TierDefinition>().toEqualTypeOf<
			ZodInfer<typeof resourceV2TierDefinitionSchema>
		>();
		expectTypeOf<ResourceV2TierTrackDefinition>().toEqualTypeOf<
			ZodInfer<typeof resourceV2TierTrackDefinitionSchema>
		>();
		expectTypeOf<ResourceV2GroupDefinition>().toEqualTypeOf<
			ZodInfer<typeof resourceV2GroupDefinitionSchema>
		>();
		expectTypeOf<ResourceV2RecentGainEntry>().toEqualTypeOf<
			ZodInfer<typeof resourceV2RecentGainEntrySchema>
		>();
	});

	it('parses a canonical definition bundle', () => {
		const parsedDefinition = resourceV2DefinitionSchema.parse(sampleDefinition);
		const parsedGroup = resourceV2GroupDefinitionSchema.parse(sampleGroup);
		const parsedRegistry = resourceV2RegistryPayloadSchema.parse({
			resources: [sampleDefinition],
			groups: [sampleGroup],
		});

		expect(parsedDefinition).toEqual(sampleDefinition);
		expect(parsedGroup).toEqual(sampleGroup);
		expect(parsedRegistry).toEqual({
			resources: [sampleDefinition],
			groups: [sampleGroup],
		});
	});

	it('rejects inconsistent bounds metadata', () => {
		expect(() =>
			resourceV2BoundsMetadataSchema.parse({
				lowerBound: 5,
				upperBound: 3,
			}),
		).toThrow(/lowerBound cannot be greater than upperBound/);
	});

	it('enforces ascending tier ranges', () => {
		expect(() =>
			resourceV2TierTrackDefinitionSchema.parse({
				id: 'absorption-track',
				tiers: [{ id: 'high', range: { min: 10 } }, sampleTierDefinition],
			}),
		).toThrow(/tier ranges must be ordered/);
	});

	it('rejects invalid tier range limits', () => {
		expect(() =>
			resourceV2TierDefinitionSchema.parse({
				id: 'invalid',
				range: { min: 5, max: 5 },
			}),
		).toThrow(/max must be greater than min/);
	});

	it('requires positive global action cost amounts', () => {
		expect(() =>
			resourceV2GlobalActionCostMetadataSchema.parse({
				amount: 0,
			}),
		).toThrow();
	});

	it('records signed recent gains only when non-zero', () => {
		const validGain = resourceV2RecentGainEntrySchema.parse({
			resourceId: 'absorption',
			delta: -2,
		});

		expect(validGain).toEqual({ resourceId: 'absorption', delta: -2 });
		expect(() =>
			resourceV2RecentGainEntrySchema.parse({
				resourceId: 'absorption',
				delta: 0,
			}),
		).toThrow(/non-zero deltas/);
	});
});
