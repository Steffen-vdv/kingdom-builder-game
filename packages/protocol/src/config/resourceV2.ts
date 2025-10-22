import { z } from 'zod';

import type { EffectDef } from '../effects';

export const resourceV2RoundingModeSchema = z.enum(['up', 'down', 'nearest']);
export type ResourceV2RoundingMode = z.infer<
	typeof resourceV2RoundingModeSchema
>;

export const resourceV2ReconciliationStrategySchema = z.enum([
	'clamp',
	'pass',
	'reject',
]);
export type ResourceV2ReconciliationStrategy = z.infer<
	typeof resourceV2ReconciliationStrategySchema
>;

export const resourceV2HookSuppressionSchema = z.object({
	suppressHooks: z.boolean().optional(),
});
export type ResourceV2HookSuppression = z.infer<
	typeof resourceV2HookSuppressionSchema
>;

const resourceV2EvaluatorSchema = z.object({
	type: z.string(),
	params: z.record(z.string(), z.unknown()).optional(),
});

const resourceV2EffectBaseSchema: z.ZodType<EffectDef> = z.lazy(() =>
	z.object({
		type: z.string().optional(),
		method: z.string().optional(),
		params: z.record(z.string(), z.unknown()).optional(),
		effects: z.array(resourceV2EffectBaseSchema).optional(),
		evaluator: resourceV2EvaluatorSchema.optional(),
		round: z.enum(['up', 'down']).optional(),
		meta: z.record(z.string(), z.unknown()).optional(),
	}),
);

export const resourceV2EffectSchema = resourceV2EffectBaseSchema.and(
	resourceV2HookSuppressionSchema,
);
export type ResourceV2EffectConfig = z.infer<typeof resourceV2EffectSchema>;

export const resourceV2TierRangeSchema = z
	.object({
		minInclusive: z.number().optional(),
		maxInclusive: z.number().optional(),
	})
	.refine(
		(range) =>
			range.minInclusive !== undefined || range.maxInclusive !== undefined,
		{
			message: 'tier range requires at least a minimum or maximum boundary',
		},
	)
	.refine(
		(range) =>
			range.minInclusive === undefined ||
			range.maxInclusive === undefined ||
			range.minInclusive <= range.maxInclusive,
		{
			message: 'tier range minimum must be <= maximum',
		},
	);
export type ResourceV2TierRange = z.infer<typeof resourceV2TierRangeSchema>;

export const resourceV2TierDefinitionSchema = z.object({
	id: z.string(),
	label: z.string(),
	description: z.string().optional(),
	icon: z.string().optional(),
	range: resourceV2TierRangeSchema,
	onEnter: z.array(resourceV2EffectSchema).optional(),
	onExit: z.array(resourceV2EffectSchema).optional(),
	meta: z.record(z.string(), z.unknown()).optional(),
});
export type ResourceV2TierDefinition = z.infer<
	typeof resourceV2TierDefinitionSchema
>;

export const resourceV2TierTrackSchema = z.object({
	id: z.string(),
	title: z.string(),
	description: z.string().optional(),
	tiers: z.array(resourceV2TierDefinitionSchema).min(1),
	showProgress: z.boolean().optional(),
	order: z.number().optional(),
});
export type ResourceV2TierTrack = z.infer<typeof resourceV2TierTrackSchema>;

export const resourceV2GlobalActionCostSchema = z.object({
	amount: z.number(),
	rounding: resourceV2RoundingModeSchema.optional(),
	reconciliation: resourceV2ReconciliationStrategySchema.optional(),
});
export type ResourceV2GlobalActionCostConfig = z.infer<
	typeof resourceV2GlobalActionCostSchema
>;

export const resourceV2DisplayMetadataSchema = z.object({
	name: z.string(),
	icon: z.string().optional(),
	description: z.string().optional(),
	order: z.number(),
	displayAsPercent: z.boolean().optional(),
});
export type ResourceV2DisplayMetadata = z.infer<
	typeof resourceV2DisplayMetadataSchema
>;

export const resourceV2GroupParentSchema = z.object({
	resourceId: z.string(),
	relation: z.enum(['sumOfAll']).default('sumOfAll'),
	meta: z.record(z.string(), z.unknown()).optional(),
});
export type ResourceV2GroupParent = z.infer<typeof resourceV2GroupParentSchema>;

export const resourceV2GroupMetadataSchema = z.object({
	id: z.string(),
	title: z.string(),
	description: z.string().optional(),
	icon: z.string().optional(),
	order: z.number(),
	parent: resourceV2GroupParentSchema.optional(),
});
export type ResourceV2GroupMetadata = z.infer<
	typeof resourceV2GroupMetadataSchema
>;

export const resourceV2DefinitionSchema = z
	.object({
		id: z.string(),
		display: resourceV2DisplayMetadataSchema,
		initialValue: z.number(),
		lowerBound: z.number().optional(),
		upperBound: z.number().optional(),
		trackValueBreakdown: z.boolean().optional(),
		trackBoundBreakdown: z.boolean().optional(),
		tierTrack: resourceV2TierTrackSchema.optional(),
		groupId: z.string().optional(),
		globalActionCost: resourceV2GlobalActionCostSchema.optional(),
		metadata: z.record(z.string(), z.unknown()).optional(),
	})
	.refine(
		(resource) =>
			resource.lowerBound === undefined ||
			resource.upperBound === undefined ||
			resource.lowerBound <= resource.upperBound,
		{
			message: 'lowerBound must be less than or equal to upperBound',
			path: ['upperBound'],
		},
	);
export type ResourceV2Definition = z.infer<typeof resourceV2DefinitionSchema>;
