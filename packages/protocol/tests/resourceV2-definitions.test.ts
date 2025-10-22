import { describe, expect, expectTypeOf, it } from 'vitest';
import type { infer as ZodInfer } from 'zod';

import {
	resourceV2BoundAdjustmentDefinitionSchema,
	resourceV2ConfigSchema,
	resourceV2DefinitionSchema,
	resourceV2GroupDefinitionSchema,
	resourceV2TierTrackSchema,
	resourceV2TransferEffectDefinitionSchema,
	resourceV2ValueEffectDefinitionSchema,
} from '../src';
import type {
	ResourceV2BoundAdjustmentDefinition,
	ResourceV2Config,
	ResourceV2Definition,
	ResourceV2GroupDefinition,
	ResourceV2TierTrack,
	ResourceV2TransferEffectDefinition,
	ResourceV2ValueEffectDefinition,
} from '../src';

describe('resourceV2 schema', () => {
	it('aligns schema and exported types', () => {
		expectTypeOf<ResourceV2Definition>().toEqualTypeOf<
			ZodInfer<typeof resourceV2DefinitionSchema>
		>();
		expectTypeOf<ResourceV2GroupDefinition>().toEqualTypeOf<
			ZodInfer<typeof resourceV2GroupDefinitionSchema>
		>();
		expectTypeOf<ResourceV2Config>().toEqualTypeOf<
			ZodInfer<typeof resourceV2ConfigSchema>
		>();
		expectTypeOf<ResourceV2TierTrack>().toEqualTypeOf<
			ZodInfer<typeof resourceV2TierTrackSchema>
		>();
		expectTypeOf<ResourceV2ValueEffectDefinition>().toEqualTypeOf<
			ZodInfer<typeof resourceV2ValueEffectDefinitionSchema>
		>();
		expectTypeOf<ResourceV2TransferEffectDefinition>().toEqualTypeOf<
			ZodInfer<typeof resourceV2TransferEffectDefinitionSchema>
		>();
		expectTypeOf<ResourceV2BoundAdjustmentDefinition>().toEqualTypeOf<
			ZodInfer<typeof resourceV2BoundAdjustmentDefinitionSchema>
		>();
	});

	it('accepts clamp-only ResourceV2 definitions', () => {
		const parent = {
			id: 'elemental-total',
			icon: 'icon-elemental-total',
			label: 'Elemental Total',
			description: 'Limited aggregate track.',
			order: 1,
			limited: true,
		} as const;

		const tierTrack: ResourceV2TierTrack = {
			id: 'absorption-tiers',
			steps: [
				{
					id: 'low',
					min: 0,
					max: 4,
					display: { label: 'Low absorption' },
					enterEffects: ['effect.absorption.enter.low'],
					exitEffects: ['effect.absorption.exit.low'],
					passives: ['passive.absorption.low'],
				},
				{
					id: 'high',
					min: 5,
					display: {
						summaryToken: 'resource.absorption.tier.high',
					},
				},
			],
			display: {
				title: 'Absorption tiers',
				summaryToken: 'resource.absorption.tier.summary',
			},
		};

		expect(resourceV2TierTrackSchema.parse(tierTrack)).toEqual(tierTrack);

		const definition: ResourceV2Definition = {
			id: 'absorption',
			display: {
				icon: 'icon-absorption',
				label: 'Absorption',
				description: 'Pilot ResourceV2 definition.',
				order: 2,
				percent: false,
			},
			bounds: {
				lowerBound: 0,
				upperBound: 10,
			},
			trackValueBreakdown: true,
			trackBoundBreakdown: false,
			tierTrack,
			group: {
				groupId: 'elemental',
				order: 2,
				parent,
			},
			globalActionCost: {
				amount: 3,
			},
		};

		const config = resourceV2ConfigSchema.parse({
			definitions: [definition],
			groups: [
				{
					id: 'elemental',
					parent,
				},
			],
		});

		expect(config.definitions?.[0]).toEqual(definition);
		expect(config.groups?.[0]).toEqual({ id: 'elemental', parent });
	});

	it('rejects tier tracks with duplicate step ids', () => {
		expect(() =>
			resourceV2DefinitionSchema.parse({
				id: 'absorption',
				display: {
					icon: 'icon-absorption',
					label: 'Absorption',
					description: 'Pilot ResourceV2 definition.',
					order: 2,
				},
				tierTrack: {
					id: 'absorption-tiers',
					steps: [
						{ id: 'tier-low', min: 0 },
						{ id: 'tier-low', min: 5 },
					],
				},
			}),
		).toThrowError(/duplicate step ids/i);
	});

	it('rejects unsupported reconciliation strategies', () => {
		expect(() =>
			resourceV2ValueEffectDefinitionSchema.parse({
				kind: 'resource:add',
				resourceId: 'absorption',
				amount: 3,
				reconciliation: 'reject',
			}),
		).toThrow();
	});

	it('requires limited parent metadata for group definitions', () => {
		expect(() =>
			resourceV2GroupDefinitionSchema.parse({
				id: 'elemental',
				parent: {
					id: 'elemental-total',
					icon: 'icon-elemental-total',
					label: 'Elemental Total',
					description: 'Limited aggregate track.',
					order: 1,
					limited: false,
				},
			}),
		).toThrow();
	});

	it('accepts clamp-only transfer definitions', () => {
		const transfer: ResourceV2TransferEffectDefinition = {
			kind: 'resource:transfer',
			donor: {
				resourceId: 'absorption',
				reconciliation: 'clamp',
			},
			recipient: {
				resourceId: 'absorption',
				reconciliation: 'clamp',
			},
			amount: 3,
			suppressHooks: true,
		};

		expect(resourceV2TransferEffectDefinitionSchema.parse(transfer)).toEqual(
			transfer,
		);
	});

	it('accepts clamp-only bound adjustments', () => {
		const adjustment: ResourceV2BoundAdjustmentDefinition = {
			kind: 'resource:upper-bound:increase',
			resourceId: 'absorption',
			amount: 2,
			reconciliation: 'clamp',
		};

		expect(resourceV2BoundAdjustmentDefinitionSchema.parse(adjustment)).toEqual(
			adjustment,
		);
	});
});
