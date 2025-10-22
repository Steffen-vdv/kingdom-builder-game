import { z } from 'zod';

export const resourceV2ReconciliationStrategySchema = z.literal('clamp');
export type ResourceV2ReconciliationStrategy = z.infer<
	typeof resourceV2ReconciliationStrategySchema
>;

export const resourceV2DisplayMetadataSchema = z.object({
	icon: z.string(),
	label: z.string(),
	description: z.string(),
	order: z.number(),
	percent: z.boolean().optional(),
});
export type ResourceV2DisplayMetadata = z.infer<
	typeof resourceV2DisplayMetadataSchema
>;

export const resourceV2BoundsConfigSchema = z.object({
	lowerBound: z.number().optional(),
	upperBound: z.number().optional(),
});
export type ResourceV2BoundsConfig = z.infer<
	typeof resourceV2BoundsConfigSchema
>;

export const resourceV2TierStepDisplaySchema = z.object({
	label: z.string().optional(),
	summaryToken: z.string().optional(),
});
export type ResourceV2TierStepDisplay = z.infer<
	typeof resourceV2TierStepDisplaySchema
>;

export const resourceV2TierStepSchema = z.object({
	id: z.string(),
	min: z.number(),
	max: z.number().optional(),
	display: resourceV2TierStepDisplaySchema.optional(),
	enterEffects: z.array(z.string()).optional(),
	exitEffects: z.array(z.string()).optional(),
	passives: z.array(z.string()).optional(),
});
export type ResourceV2TierStep = z.infer<typeof resourceV2TierStepSchema>;

export const resourceV2TierTrackDisplaySchema = z.object({
	title: z.string().optional(),
	summaryToken: z.string().optional(),
});
export type ResourceV2TierTrackDisplay = z.infer<
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
					message: 'ResourceV2 tier tracks cannot contain duplicate step ids.',
					path: ['steps', index, 'id'],
				});
			}
			seen.add(step.id);
		});
	});
export type ResourceV2TierTrack = z.infer<typeof resourceV2TierTrackSchema>;

export const resourceV2GroupParentMetadataSchema =
	resourceV2DisplayMetadataSchema
		.extend({
			id: z.string(),
			limited: z.literal(true),
		})
		.strict();
export type ResourceV2GroupParentMetadata = z.infer<
	typeof resourceV2GroupParentMetadataSchema
>;

export const resourceV2GroupMetadataSchema = z.object({
	groupId: z.string(),
	order: z.number(),
	parent: resourceV2GroupParentMetadataSchema.optional(),
});
export type ResourceV2GroupMetadata = z.infer<
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
export type ResourceV2Definition = z.infer<typeof resourceV2DefinitionSchema>;

export const resourceV2GroupDefinitionSchema = z
	.object({
		id: z.string(),
		parent: resourceV2GroupParentMetadataSchema,
	})
	.strict();
export type ResourceV2GroupDefinition = z.infer<
	typeof resourceV2GroupDefinitionSchema
>;

export const resourceV2TransferEndpointSchema = z.object({
	resourceId: z.string(),
	reconciliation: resourceV2ReconciliationStrategySchema,
});
export type ResourceV2TransferEndpointDefinition = z.infer<
	typeof resourceV2TransferEndpointSchema
>;

export const resourceV2ValueEffectDefinitionSchema = z.object({
	kind: z.union([z.literal('resource:add'), z.literal('resource:remove')]),
	resourceId: z.string(),
	amount: z.number(),
	reconciliation: resourceV2ReconciliationStrategySchema,
	suppressHooks: z.boolean().optional(),
});
export type ResourceV2ValueEffectDefinition = z.infer<
	typeof resourceV2ValueEffectDefinitionSchema
>;

export const resourceV2TransferEffectDefinitionSchema = z.object({
	kind: z.literal('resource:transfer'),
	donor: resourceV2TransferEndpointSchema,
	recipient: resourceV2TransferEndpointSchema,
	amount: z.number(),
	suppressHooks: z.boolean().optional(),
});
export type ResourceV2TransferEffectDefinition = z.infer<
	typeof resourceV2TransferEffectDefinitionSchema
>;

export const resourceV2BoundAdjustmentDefinitionSchema = z.object({
	kind: z.union([
		z.literal('resource:lower-bound:increase'),
		z.literal('resource:upper-bound:increase'),
	]),
	resourceId: z.string(),
	amount: z.number(),
	reconciliation: resourceV2ReconciliationStrategySchema,
});
export type ResourceV2BoundAdjustmentDefinition = z.infer<
	typeof resourceV2BoundAdjustmentDefinitionSchema
>;

export const resourceV2ConfigSchema = z.object({
	definitions: z.array(resourceV2DefinitionSchema).optional(),
	groups: z.array(resourceV2GroupDefinitionSchema).optional(),
});
export type ResourceV2Config = z.infer<typeof resourceV2ConfigSchema>;
