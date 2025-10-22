import { z } from 'zod';

const DUPLICATE_TIER_STEP_ID_MESSAGE =
	'ResourceV2 tier tracks must not repeat step ids. Remove the duplicate id.';
const INVALID_TIER_RANGE_MESSAGE =
	'ResourceV2 tier step max must be greater than or equal to min when provided.';
const PARENT_REQUIRED_MESSAGE =
	'ResourceV2 MVP requires ResourceGroup definitions to provide a virtual parent. Add parent metadata.';
const CLAMP_ONLY_MESSAGE =
	'ResourceV2 MVP only supports clamp reconciliation. Remove the unsupported reconciliation configuration.';

export const resourceV2DisplayMetadataSchema = z.object({
	icon: z.string(),
	label: z.string(),
	description: z.string(),
	order: z.number(),
	percent: z.boolean().optional(),
});

export type ResourceV2DisplayMetadataConfig = z.infer<
	typeof resourceV2DisplayMetadataSchema
>;

export const resourceV2BoundsSchema = z
	.object({
		lowerBound: z.number().optional(),
		upperBound: z.number().optional(),
	})
	.refine(
		(value) => value.lowerBound !== undefined || value.upperBound !== undefined,
		{
			message:
				'ResourceV2 bounds must configure lowerBound and/or upperBound when the object is provided.',
		},
	);

export type ResourceV2BoundsConfig = z.infer<typeof resourceV2BoundsSchema>;

export const resourceV2TierStepDisplaySchema = z.object({
	label: z.string().optional(),
	summaryToken: z.string().optional(),
});

export type ResourceV2TierStepDisplayConfig = z.infer<
	typeof resourceV2TierStepDisplaySchema
>;

export const resourceV2TierStepSchema = z
	.object({
		id: z.string(),
		min: z.number(),
		max: z.number().optional(),
		display: resourceV2TierStepDisplaySchema.optional(),
		enterEffects: z.array(z.string()).optional(),
		exitEffects: z.array(z.string()).optional(),
		passives: z.array(z.string()).optional(),
	})
	.superRefine((step, ctx) => {
		if (step.max !== undefined && step.max < step.min) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: INVALID_TIER_RANGE_MESSAGE,
				path: ['max'],
			});
		}
	});

export type ResourceV2TierStepConfig = z.infer<typeof resourceV2TierStepSchema>;

export const resourceV2TierTrackDisplaySchema = z.object({
	title: z.string().optional(),
	summaryToken: z.string().optional(),
});

export type ResourceV2TierTrackDisplayConfig = z.infer<
	typeof resourceV2TierTrackDisplaySchema
>;

export const resourceV2TierTrackSchema = z
	.object({
		id: z.string(),
		steps: z.array(resourceV2TierStepSchema).min(1),
		display: resourceV2TierTrackDisplaySchema.optional(),
	})
	.superRefine((track, ctx) => {
		const seen = new Set<string>();
		for (const [index, step] of track.steps.entries()) {
			if (seen.has(step.id)) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: DUPLICATE_TIER_STEP_ID_MESSAGE,
					path: ['steps', index, 'id'],
				});
			}
			seen.add(step.id);
		}
	});

export type ResourceV2TierTrackConfig = z.infer<
	typeof resourceV2TierTrackSchema
>;

const resourceV2ParentLimitedFlagSchema: z.ZodType<true> = z
	.boolean()
	.superRefine((value, ctx) => {
		if (!value) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message:
					'ResourceV2 group parents are virtual limited resources and must set limited=true.',
			});
		}
	})
	.transform(() => true as const);

export const resourceV2GroupParentSchema =
	resourceV2DisplayMetadataSchema.extend({
		id: z.string(),
		limited: resourceV2ParentLimitedFlagSchema,
	});

export type ResourceV2GroupParentConfig = z.infer<
	typeof resourceV2GroupParentSchema
>;

export const resourceV2GroupMetadataSchema = z
	.object({
		groupId: z.string(),
		order: z.number(),
		parent: resourceV2GroupParentSchema.optional(),
	})
	.superRefine((metadata, ctx) => {
		if (!metadata.parent) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: PARENT_REQUIRED_MESSAGE,
				path: ['parent'],
			});
		}
	});

export type ResourceV2GroupMetadataConfig = z.infer<
	typeof resourceV2GroupMetadataSchema
>;

export const resourceV2GroupDefinitionSchema = z.object({
	id: z.string(),
	parent: resourceV2GroupParentSchema,
});

export type ResourceV2GroupDefinitionConfig = z.infer<
	typeof resourceV2GroupDefinitionSchema
>;

export const resourceV2GlobalActionCostSchema = z.object({
	amount: z.number(),
});

export type ResourceV2GlobalActionCostConfig = z.infer<
	typeof resourceV2GlobalActionCostSchema
>;

export const resourceV2DefinitionSchema = z.object({
	id: z.string(),
	display: resourceV2DisplayMetadataSchema,
	bounds: resourceV2BoundsSchema.optional(),
	trackValueBreakdown: z.boolean().optional(),
	trackBoundBreakdown: z.boolean().optional(),
	tierTrack: resourceV2TierTrackSchema.optional(),
	group: resourceV2GroupMetadataSchema.optional(),
	globalActionCost: resourceV2GlobalActionCostSchema.optional(),
});

export type ResourceV2DefinitionConfig = z.infer<
	typeof resourceV2DefinitionSchema
>;

export const resourceV2ReconciliationSchema = z.literal('clamp', {
	message: CLAMP_ONLY_MESSAGE,
});

export type ResourceV2ReconciliationStrategyConfig = z.infer<
	typeof resourceV2ReconciliationSchema
>;

export const resourceV2LimitedParentFlagSetSchema: z.ZodType<
	ReadonlySet<ResourceV2ReconciliationStrategyConfig>
> = z
	.array(resourceV2ReconciliationSchema)
	.transform((flags) => new Set(flags));

export type ResourceV2LimitedParentFlagSetConfig = z.infer<
	typeof resourceV2LimitedParentFlagSetSchema
>;

export const resourceV2DefinitionsPayloadSchema = z.object({
	definitions: z.array(resourceV2DefinitionSchema).optional(),
	groups: z.array(resourceV2GroupDefinitionSchema).optional(),
	limitedParentFlagSet: resourceV2LimitedParentFlagSetSchema.optional(),
});

export type ResourceV2DefinitionsPayloadConfig = z.infer<
	typeof resourceV2DefinitionsPayloadSchema
>;
