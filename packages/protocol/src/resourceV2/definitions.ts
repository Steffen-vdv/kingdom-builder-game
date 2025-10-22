import { z } from 'zod';

const CLAMP_ONLY_MESSAGE =
	'ResourceV2 MVP only supports clamp reconciliation. Remove the unsupported reconciliation configuration.';

const DUPLICATE_TIER_ID_MESSAGE =
	'ResourceV2 tier track contains duplicate step ids. Ensure each tier id is unique.';

const INVALID_TIER_RANGE_MESSAGE =
	'ResourceV2 tier step max must be greater than its minimum value when provided.';

export const resourceV2ReconciliationStrategySchema = z.custom<'clamp'>(
	(value) => value === 'clamp',
	{
		message: CLAMP_ONLY_MESSAGE,
	},
);

export type ResourceV2ReconciliationStrategy = z.infer<
	typeof resourceV2ReconciliationStrategySchema
>;

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
		if (step.max !== undefined && step.max <= step.min) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['max'],
				message: INVALID_TIER_RANGE_MESSAGE,
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
		track.steps.forEach((step, index) => {
			if (seen.has(step.id)) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['steps', index, 'id'],
					message: DUPLICATE_TIER_ID_MESSAGE,
				});
			}
			seen.add(step.id);
		});
	});

export type ResourceV2TierTrackConfig = z.infer<
	typeof resourceV2TierTrackSchema
>;

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

export const resourceV2BoundsConfigSchema = z.object({
	lowerBound: z.number().optional(),
	upperBound: z.number().optional(),
});

export type ResourceV2BoundsConfig = z.infer<
	typeof resourceV2BoundsConfigSchema
>;

export const resourceV2GroupParentMetadataSchema =
	resourceV2DisplayMetadataSchema
		.extend({
			id: z.string(),
			limited: z.literal(true),
		})
		.strict();

export type ResourceV2GroupParentMetadataConfig = z.infer<
	typeof resourceV2GroupParentMetadataSchema
>;

export const resourceV2GroupMetadataSchema = z.object({
	groupId: z.string(),
	order: z.number(),
	parent: resourceV2GroupParentMetadataSchema.optional(),
});

export type ResourceV2GroupMetadataConfig = z.infer<
	typeof resourceV2GroupMetadataSchema
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
	bounds: resourceV2BoundsConfigSchema.optional(),
	trackValueBreakdown: z.boolean().optional(),
	trackBoundBreakdown: z.boolean().optional(),
	tierTrack: resourceV2TierTrackSchema.optional(),
	group: resourceV2GroupMetadataSchema.optional(),
	globalActionCost: resourceV2GlobalActionCostSchema.optional(),
});

export type ResourceV2DefinitionConfig = z.infer<
	typeof resourceV2DefinitionSchema
>;

export const resourceV2GroupDefinitionSchema = z.object({
	id: z.string(),
	parent: resourceV2GroupParentMetadataSchema,
});

export type ResourceV2GroupDefinitionConfig = z.infer<
	typeof resourceV2GroupDefinitionSchema
>;

function uniqueById<T extends { id: string }>(
	values: readonly T[],
	ctx: z.RefinementCtx,
	basePath: (string | number)[] = [],
) {
	const ids = new Set<string>();
	values.forEach((value, index) => {
		if (ids.has(value.id)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: [...basePath, index, 'id'],
				message: 'ResourceV2 ids must be unique within their collection.',
			});
			return;
		}
		ids.add(value.id);
	});
}

export const resourceV2DefinitionsSchema = z
	.array(resourceV2DefinitionSchema)
	.superRefine((definitions, ctx) => {
		uniqueById(definitions, ctx);
	});

export const resourceV2GroupDefinitionsSchema = z
	.array(resourceV2GroupDefinitionSchema)
	.superRefine((groups, ctx) => {
		uniqueById(groups, ctx);
	});

export const resourceV2ConfigSchema = z.object({
	definitions: resourceV2DefinitionsSchema.optional(),
	groups: resourceV2GroupDefinitionsSchema.optional(),
});

export type ResourceV2Config = z.infer<typeof resourceV2ConfigSchema>;
