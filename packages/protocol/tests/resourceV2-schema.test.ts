import { describe, expect, it, expectTypeOf } from 'vitest';
import type { infer as ZodInfer } from 'zod';

import {
	resourceV2DefinitionSchema,
	resourceV2GroupMetadataSchema,
	resourceV2RoundingModeSchema,
	resourceV2ReconciliationStrategySchema,
	resourceV2HookSuppressionSchema,
	resourceV2GlobalActionCostSchema,
	resourceV2TierRangeSchema,
	resourceV2ValueDeltaSchema,
	resourceV2TransferSchema,
	resourceV2BoundAdjustmentSchema,
	resourceV2TierTrackSchema,
} from '../src';
import type {
	ResourceV2Definition,
	ResourceV2GroupMetadata,
	ResourceV2RoundingMode,
	ResourceV2ReconciliationStrategy,
	ResourceV2HookSuppression,
	ResourceV2GlobalActionCost,
	ResourceV2TierRange,
	ResourceV2ValueDelta,
	ResourceV2Transfer,
	ResourceV2BoundAdjustment,
	ResourceV2TierTrack,
} from '../src';

const tierTrackFixture: ResourceV2TierTrack = {
	id: 'absorption-tier',
	title: 'Absorption Stability',
	description: 'Keeps absorption within operational thresholds.',
	tiers: [
		{
			id: 'stable',
			range: { min: 0, max: 49 },
			enterEffects: [
				{
					type: 'resource',
					method: 'add',
					params: { key: 'absorption', amount: 1 },
				},
			],
			exitEffects: [
				{
					type: 'resource',
					method: 'remove',
					params: { key: 'absorption', amount: 1 },
				},
			],
			passivePreview: { id: 'stable-preview', effects: [] },
			text: {
				summary: 'Stable',
				description: 'Absorption remains controlled.',
				removal: 'Stable effects cleared.',
			},
			display: {
				icon: 'icon-tier-stable',
				title: 'Stable',
				summaryToken: 'tiers.absorption.stable',
				removalCondition: 'Absorption >= 50',
			},
		},
		{
			id: 'surge',
			range: { min: 50 },
			text: {
				summary: 'Surge',
			},
		},
	],
};

describe('resourceV2 schemas', () => {
	it('keeps type definitions aligned with schemas', () => {
		expectTypeOf<ResourceV2Definition>().toEqualTypeOf<
			ZodInfer<typeof resourceV2DefinitionSchema>
		>();
		expectTypeOf<ResourceV2GroupMetadata>().toEqualTypeOf<
			ZodInfer<typeof resourceV2GroupMetadataSchema>
		>();
		expectTypeOf<ResourceV2RoundingMode>().toEqualTypeOf<
			ZodInfer<typeof resourceV2RoundingModeSchema>
		>();
		expectTypeOf<ResourceV2ReconciliationStrategy>().toEqualTypeOf<
			ZodInfer<typeof resourceV2ReconciliationStrategySchema>
		>();
		expectTypeOf<ResourceV2HookSuppression>().toEqualTypeOf<
			ZodInfer<typeof resourceV2HookSuppressionSchema>
		>();
		expectTypeOf<ResourceV2GlobalActionCost>().toEqualTypeOf<
			ZodInfer<typeof resourceV2GlobalActionCostSchema>
		>();
		expectTypeOf<ResourceV2TierRange>().toEqualTypeOf<
			ZodInfer<typeof resourceV2TierRangeSchema>
		>();
		expectTypeOf<ResourceV2TierTrack>().toEqualTypeOf<
			ZodInfer<typeof resourceV2TierTrackSchema>
		>();
		expectTypeOf<ResourceV2ValueDelta>().toEqualTypeOf<
			ZodInfer<typeof resourceV2ValueDeltaSchema>
		>();
		expectTypeOf<ResourceV2Transfer>().toEqualTypeOf<
			ZodInfer<typeof resourceV2TransferSchema>
		>();
		expectTypeOf<ResourceV2BoundAdjustment>().toEqualTypeOf<
			ZodInfer<typeof resourceV2BoundAdjustmentSchema>
		>();
	});

	it('accepts complete resource definitions with tier tracks and global costs', () => {
		const definition: ResourceV2Definition = {
			id: 'absorption',
			name: 'Absorption',
			icon: 'icon-absorption',
			description: 'Absorbs incoming magical flux.',
			order: 1,
			isPercent: true,
			lowerBound: 0,
			upperBound: 100,
			trackValueBreakdown: true,
			trackBoundBreakdown: false,
			tierTrack: tierTrackFixture,
			metadata: { category: 'elemental' },
			groupId: 'energy',
			globalActionCost: { amount: 1 },
		};

		const parsed = resourceV2DefinitionSchema.parse(definition);

		expect(parsed).toEqual(definition);
	});

	it('rejects definitions with invalid bounds', () => {
		expect(() =>
			resourceV2DefinitionSchema.parse({
				id: 'absorption',
				name: 'Absorption',
				order: 0,
				lowerBound: 10,
				upperBound: 5,
			}),
		).toThrow();
	});

	it('validates group metadata with a parent and ordered children', () => {
		const group: ResourceV2GroupMetadata = {
			id: 'energy',
			name: 'Energy',
			description: 'Tracks all energy-adjacent resources.',
			order: 0,
			parent: {
				id: 'energy-total',
				name: 'Total Energy',
				order: 0,
				limited: true,
				relation: 'sumOfAll',
				trackValueBreakdown: true,
			},
			children: ['absorption', 'focus'],
			metadata: { icon: 'group-energy' },
		};

		const parsed = resourceV2GroupMetadataSchema.parse(group);

		expect(parsed).toEqual(group);
	});

	it('rejects groups without children', () => {
		expect(() =>
			resourceV2GroupMetadataSchema.parse({
				id: 'empty',
				name: 'Empty',
				order: 0,
				children: [],
			}),
		).toThrow();
	});

	it('supports rounding and reconciliation enumerations', () => {
		expect(resourceV2RoundingModeSchema.parse('nearest')).toBe('nearest');
		expect(resourceV2ReconciliationStrategySchema.parse('reject')).toBe(
			'reject',
		);
		expect(() => resourceV2RoundingModeSchema.parse('floor')).toThrow();
		expect(() =>
			resourceV2ReconciliationStrategySchema.parse('bounce'),
		).toThrow();
	});

	it('enforces hook suppression flag shape', () => {
		expect(resourceV2HookSuppressionSchema.parse({})).toEqual({});
		expect(
			resourceV2HookSuppressionSchema.parse({ suppressHooks: true }),
		).toEqual({
			suppressHooks: true,
		});
	});

	it('enforces non-negative global action costs', () => {
		expect(resourceV2GlobalActionCostSchema.parse({ amount: 2 })).toEqual({
			amount: 2,
		});
		expect(() =>
			resourceV2GlobalActionCostSchema.parse({ amount: -1 }),
		).toThrow();
	});

	it('guards tier ranges and definitions', () => {
		expect(resourceV2TierRangeSchema.parse({ min: -5, max: 5 })).toEqual({
			min: -5,
			max: 5,
		});
		expect(() =>
			resourceV2TierRangeSchema.parse({ min: 10, max: 0 }),
		).toThrow();
		expect(resourceV2TierTrackSchema.parse(tierTrackFixture)).toEqual(
			tierTrackFixture,
		);
	});

	it('requires value deltas to declare amount or percent', () => {
		const percentDelta: ResourceV2ValueDelta = {
			resourceId: 'absorption',
			percent: 25,
			rounding: 'nearest',
			reconciliation: 'clamp',
			suppressHooks: true,
		};

		expect(resourceV2ValueDeltaSchema.parse(percentDelta)).toEqual(
			percentDelta,
		);
		expect(() =>
			resourceV2ValueDeltaSchema.parse({
				resourceId: 'absorption',
			}),
		).toThrow();
	});

	it('validates transfer payloads and bound adjustments', () => {
		const transfer: ResourceV2Transfer = {
			amount: 3,
			rounding: 'up',
			suppressHooks: false,
			from: { resourceId: 'absorption', reconciliation: 'clamp' },
			to: { resourceId: 'focus', reconciliation: 'pass' },
		};

		expect(resourceV2TransferSchema.parse(transfer)).toEqual(transfer);
		expect(() =>
			resourceV2TransferSchema.parse({
				from: { resourceId: 'a' },
				to: { resourceId: 'b' },
			}),
		).toThrow();

		const boundAdjustment: ResourceV2BoundAdjustment = {
			resourceId: 'absorption',
			amount: 5,
			target: 'upper',
			reconciliation: 'clamp',
		};

		expect(resourceV2BoundAdjustmentSchema.parse(boundAdjustment)).toEqual(
			boundAdjustment,
		);
	});
});
