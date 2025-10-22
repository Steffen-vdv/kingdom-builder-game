import { z } from 'zod';

import type { EffectDef } from '../effects';
import { effectSchema } from './effect_schemas';

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

export const resourceV2GlobalActionCostSchema = z.object({
	amount: z.number().int().nonnegative(),
});

export type ResourceV2GlobalActionCost = z.infer<
	typeof resourceV2GlobalActionCostSchema
>;

export const resourceV2TierRangeSchema = z
	.object({
		min: z.number().int(),
		max: z.number().int().optional(),
	})
	.refine((range) => range.max === undefined || range.max >= range.min, {
		message: 'max must be greater than or equal to min',
		path: ['max'],
	});

export type ResourceV2TierRange = z.infer<typeof resourceV2TierRangeSchema>;

export const resourceV2TierPassivePreviewSchema = z.object({
	id: z.string(),
	effects: z.array(effectSchema).optional(),
});

export type ResourceV2TierPassivePreview = z.infer<
	typeof resourceV2TierPassivePreviewSchema
>;

export const resourceV2TierTextTokensSchema = z.object({
	summary: z.string().optional(),
	description: z.string().optional(),
	removal: z.string().optional(),
});

export type ResourceV2TierTextTokens = z.infer<
	typeof resourceV2TierTextTokensSchema
>;

export const resourceV2TierDisplayMetadataSchema = z.object({
	icon: z.string().optional(),
	title: z.string().optional(),
	summaryToken: z.string().optional(),
	removalCondition: z.string().optional(),
});

export type ResourceV2TierDisplayMetadata = z.infer<
	typeof resourceV2TierDisplayMetadataSchema
>;

export const resourceV2TierDefinitionSchema = z.object({
	id: z.string(),
	range: resourceV2TierRangeSchema,
	enterEffects: z.array(effectSchema).optional(),
	exitEffects: z.array(effectSchema).optional(),
	passivePreview: resourceV2TierPassivePreviewSchema.optional(),
	text: resourceV2TierTextTokensSchema.optional(),
	display: resourceV2TierDisplayMetadataSchema.optional(),
});

export type ResourceV2TierDefinition = z.infer<
	typeof resourceV2TierDefinitionSchema
>;

export const resourceV2TierTrackSchema = z.object({
	id: z.string(),
	title: z.string().optional(),
	description: z.string().optional(),
	tiers: z.array(resourceV2TierDefinitionSchema).min(1),
});

export type ResourceV2TierTrack = z.infer<typeof resourceV2TierTrackSchema>;

const resourceV2DefinitionFields = z.object({
	id: z.string(),
	name: z.string(),
	icon: z.string().optional(),
	description: z.string().optional(),
	order: z.number().int(),
	isPercent: z.boolean().optional(),
	lowerBound: z.number().int().optional(),
	upperBound: z.number().int().optional(),
	trackValueBreakdown: z.boolean().optional(),
	trackBoundBreakdown: z.boolean().optional(),
	tierTrack: resourceV2TierTrackSchema.optional(),
	metadata: z.record(z.string(), z.unknown()).optional(),
});

const withBoundValidation = <Schema extends z.ZodTypeAny>(schema: Schema) =>
	schema.superRefine((definition, ctx) => {
		const lower = (definition as { lowerBound?: number }).lowerBound;
		const upper = (definition as { upperBound?: number }).upperBound;
		if (lower !== undefined && upper !== undefined && upper < lower) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'upperBound must be greater than or equal to lowerBound',
				path: ['upperBound'],
			});
		}
	});

export const resourceV2BaseDefinitionSchema = withBoundValidation(
	resourceV2DefinitionFields,
);

export type ResourceV2BaseDefinition = z.infer<
	typeof resourceV2BaseDefinitionSchema
>;

export const resourceV2GroupParentSchema = withBoundValidation(
	resourceV2DefinitionFields.extend({
		relation: z.literal('sumOfAll').default('sumOfAll'),
		limited: z.literal(true).optional(),
	}),
);

export type ResourceV2GroupParent = z.infer<typeof resourceV2GroupParentSchema>;

export const resourceV2DefinitionSchema = withBoundValidation(
	resourceV2DefinitionFields.extend({
		groupId: z.string().optional(),
		globalActionCost: resourceV2GlobalActionCostSchema.optional(),
		limited: z.boolean().optional(),
	}),
);

export type ResourceV2Definition = z.infer<typeof resourceV2DefinitionSchema>;

export const resourceV2GroupMetadataSchema = z.object({
	id: z.string(),
	name: z.string(),
	icon: z.string().optional(),
	description: z.string().optional(),
	order: z.number().int(),
	parent: resourceV2GroupParentSchema.optional(),
	children: z.array(z.string()).min(1),
	metadata: z.record(z.string(), z.unknown()).optional(),
});

export type ResourceV2GroupMetadata = z.infer<
	typeof resourceV2GroupMetadataSchema
>;

export const resourceV2ValueDeltaSchema = z
	.object({
		resourceId: z.string(),
		amount: z.number().int().optional(),
		percent: z.number().optional(),
		rounding: resourceV2RoundingModeSchema.optional(),
		reconciliation: resourceV2ReconciliationStrategySchema.optional(),
		suppressHooks: z.boolean().optional(),
	})
	.refine(
		(value) => value.amount !== undefined || value.percent !== undefined,
		{
			message: 'amount or percent must be provided',
			path: ['amount'],
		},
	);

export type ResourceV2ValueDelta = z.infer<typeof resourceV2ValueDeltaSchema>;

const resourceV2TransferEndpointSchema = z.object({
	resourceId: z.string(),
	reconciliation: resourceV2ReconciliationStrategySchema.optional(),
});

export const resourceV2TransferSchema = z
	.object({
		amount: z.number().int().optional(),
		percent: z.number().optional(),
		rounding: resourceV2RoundingModeSchema.optional(),
		suppressHooks: z.boolean().optional(),
		from: resourceV2TransferEndpointSchema,
		to: resourceV2TransferEndpointSchema,
	})
	.refine(
		(value) => value.amount !== undefined || value.percent !== undefined,
		{
			message: 'amount or percent must be provided',
			path: ['amount'],
		},
	);

export type ResourceV2Transfer = z.infer<typeof resourceV2TransferSchema>;

export const resourceV2BoundAdjustmentSchema = z.object({
	resourceId: z.string(),
	amount: z.number().int(),
	target: z.enum(['lower', 'upper']),
	reconciliation: resourceV2ReconciliationStrategySchema.optional(),
});

export type ResourceV2BoundAdjustment = z.infer<
	typeof resourceV2BoundAdjustmentSchema
>;

export const resourceV2EffectSchema: z.ZodType<EffectDef> = effectSchema;
