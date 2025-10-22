import { describe, expect, it, expectTypeOf } from 'vitest';
import type { infer as ZodInfer } from 'zod';

import {
	resourceV2DefinitionSchema,
	resourceV2GroupMetadataSchema,
	resourceV2GroupParentSchema,
	resourceV2RoundingModeSchema,
	resourceV2ReconciliationStrategySchema,
	resourceV2TierDefinitionSchema,
} from '../src';
import type {
	ResourceV2Definition,
	ResourceV2GroupMetadata,
	ResourceV2GroupParent,
	ResourceV2RoundingMode,
	ResourceV2ReconciliationStrategy,
	ResourceV2TierDefinition,
} from '../src';

describe('ResourceV2 schema', () => {
	it('matches exported types for definitions and helpers', () => {
		expectTypeOf<ResourceV2Definition>().toEqualTypeOf<
			ZodInfer<typeof resourceV2DefinitionSchema>
		>();
		expectTypeOf<ResourceV2GroupMetadata>().toEqualTypeOf<
			ZodInfer<typeof resourceV2GroupMetadataSchema>
		>();
		expectTypeOf<ResourceV2GroupParent>().toEqualTypeOf<
			ZodInfer<typeof resourceV2GroupParentSchema>
		>();
		expectTypeOf<ResourceV2TierDefinition>().toEqualTypeOf<
			ZodInfer<typeof resourceV2TierDefinitionSchema>
		>();
		expectTypeOf<ResourceV2RoundingMode>().toEqualTypeOf<
			ZodInfer<typeof resourceV2RoundingModeSchema>
		>();
		expectTypeOf<ResourceV2ReconciliationStrategy>().toEqualTypeOf<
			ZodInfer<typeof resourceV2ReconciliationStrategySchema>
		>();
	});

	it('accepts a canonical ResourceV2 definition with tiering and hooks', () => {
		const definition: ResourceV2Definition = {
			id: 'actionPoints',
			display: {
				name: 'Action Points',
				icon: 'icon-ap',
				description: 'Spend to execute main actions during your turn.',
				order: 0,
				displayAsPercent: false,
			},
			initialValue: 3,
			lowerBound: 0,
			upperBound: 6,
			trackValueBreakdown: true,
			trackBoundBreakdown: true,
			tierTrack: {
				id: 'momentum',
				title: 'Action Momentum',
				description: 'Tracks efficiency tiers awarded by diligent planning.',
				showProgress: true,
				tiers: [
					{
						id: 'strained',
						label: 'Strained',
						description:
							'Players operating below capacity gain a relief effect.',
						icon: 'icon-strained',
						range: { maxInclusive: 1 },
						onEnter: [
							{
								type: 'resource',
								method: 'add',
								params: {
									resourceId: 'actionPoints',
									amount: 1,
								},
								suppressHooks: true,
							},
						],
						onExit: [
							{
								type: 'log',
								method: 'info',
								params: {
									message: 'Leaving strained tier',
								},
							},
						],
					},
					{
						id: 'steady',
						label: 'Steady',
						range: { minInclusive: 2, maxInclusive: 4 },
					},
					{
						id: 'surplus',
						label: 'Surplus',
						range: { minInclusive: 5 },
					},
				],
			},
			groupId: 'momentum-group',
			globalActionCost: {
				amount: 1,
				rounding: 'down',
				reconciliation: 'clamp',
			},
			metadata: {
				analyticsKey: 'ap-primary',
			},
		};

		const parsed = resourceV2DefinitionSchema.parse(definition);

		expect(parsed).toEqual(definition);
	});

	it('applies defaults for group parent relation', () => {
		const group: ResourceV2GroupMetadata = {
			id: 'population',
			title: 'Population Roles',
			order: 1,
			parent: {
				resourceId: 'population-total',
			},
		};

		const parsed = resourceV2GroupMetadataSchema.parse(group);

		expect(parsed.parent?.relation).toBe('sumOfAll');

		const parentOnly = resourceV2GroupParentSchema.parse({
			resourceId: 'population-total',
		});

		expect(parentOnly.relation).toBe('sumOfAll');
	});

	it('rejects tier ranges without boundaries', () => {
		expect(() =>
			resourceV2TierDefinitionSchema.parse({
				id: 'invalid',
				label: 'Invalid',
				range: {},
			}),
		).toThrowErrorMatchingInlineSnapshot(`
[ZodError: [
  {
    "code": "custom",
    "path": [
      "range"
    ],
    "message": "tier range requires at least a minimum or maximum boundary"
  }
]]
                `);
	});

	it('rejects resources with inverted bounds', () => {
		expect(() =>
			resourceV2DefinitionSchema.parse({
				id: 'badBounds',
				display: {
					name: 'Broken',
					order: 0,
				},
				initialValue: 0,
				lowerBound: 10,
				upperBound: 5,
			}),
		).toThrowErrorMatchingInlineSnapshot(`
[ZodError: [
  {
    "code": "custom",
    "path": [
      "upperBound"
    ],
    "message": "lowerBound must be less than or equal to upperBound"
  }
]]
                `);
	});

	it('rejects unsupported rounding and reconciliation strategies', () => {
		expect(() => resourceV2RoundingModeSchema.parse('sideways')).toThrow();
		expect(() =>
			resourceV2ReconciliationStrategySchema.parse('bounce'),
		).toThrow();
	});
});
