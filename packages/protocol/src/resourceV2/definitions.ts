import { z } from 'zod';

const resourceV2DisplaySchema = z.object({
	icon: z.string(),
	label: z.string(),
	description: z.string(),
	order: z.number(),
	percent: z.boolean().optional(),
});

const resourceV2BoundsSchema = z
	.object({
		lowerBound: z.number().optional(),
		upperBound: z.number().optional(),
	})
	.refine(
		(bounds) =>
			bounds.lowerBound !== undefined || bounds.upperBound !== undefined,
		'ResourceV2 bounds must specify at least one limit.',
	);

const resourceV2TierStepDisplaySchema = z.object({
	label: z.string().optional(),
	summaryToken: z.string().optional(),
});

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

const DUPLICATE_TIER_STEP_MESSAGE =
	'ResourceV2 tier tracks cannot define duplicate step ids.';

export const resourceV2TierTrackSchema = z
	.object({
		id: z.string(),
		steps: z.array(resourceV2TierStepSchema).min(1),
		display: z
			.object({
				title: z.string().optional(),
				summaryToken: z.string().optional(),
			})
			.optional(),
	})
	.superRefine((track, ctx) => {
		const seen = new Set<string>();
		track.steps.forEach((step, index) => {
			if (seen.has(step.id)) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['steps', index, 'id'],
					message: DUPLICATE_TIER_STEP_MESSAGE,
				});
				return;
			}
			seen.add(step.id);
		});
	});

export type ResourceV2TierTrack = z.infer<typeof resourceV2TierTrackSchema>;

const resourceV2GroupParentSchema = resourceV2DisplaySchema.extend({
	id: z.string(),
	limited: z.literal(true),
});

export type ResourceV2GroupParentMetadata = z.infer<
	typeof resourceV2GroupParentSchema
>;

export const resourceV2GroupMetadataSchema = z.object({
	groupId: z.string(),
	order: z.number(),
	parent: resourceV2GroupParentSchema.optional(),
});

export type ResourceV2GroupMetadata = z.infer<
	typeof resourceV2GroupMetadataSchema
>;

export const resourceV2DefinitionSchema = z.object({
	id: z.string(),
	display: resourceV2DisplaySchema,
	bounds: resourceV2BoundsSchema.optional(),
	trackValueBreakdown: z.boolean().optional(),
	trackBoundBreakdown: z.boolean().optional(),
	tierTrack: resourceV2TierTrackSchema.optional(),
	group: resourceV2GroupMetadataSchema.optional(),
	globalActionCost: z.object({ amount: z.number() }).optional(),
});

export type ResourceV2Definition = z.infer<typeof resourceV2DefinitionSchema>;

export const resourceV2GroupDefinitionSchema = z.object({
	id: z.string(),
	parent: resourceV2GroupParentSchema,
});

export type ResourceV2GroupDefinition = z.infer<
	typeof resourceV2GroupDefinitionSchema
>;

export const resourceV2ReconciliationStrategySchema = z.literal('clamp');

export type ResourceV2ReconciliationStrategy = z.infer<
	typeof resourceV2ReconciliationStrategySchema
>;

export const resourceV2ValueEffectSchema = z.object({
	kind: z.enum(['resource:add', 'resource:remove']),
	resourceId: z.string(),
	amount: z.number(),
	reconciliation: resourceV2ReconciliationStrategySchema,
	suppressHooks: z.boolean().optional(),
});

export type ResourceV2ValueEffectDefinition = z.infer<
	typeof resourceV2ValueEffectSchema
>;

const resourceV2TransferEndpointSchema = z.object({
	resourceId: z.string(),
	reconciliation: resourceV2ReconciliationStrategySchema,
});

export const resourceV2TransferEffectSchema = z.object({
	kind: z.literal('resource:transfer'),
	donor: resourceV2TransferEndpointSchema,
	recipient: resourceV2TransferEndpointSchema,
	amount: z.number(),
	suppressHooks: z.boolean().optional(),
});

export type ResourceV2TransferEffectDefinition = z.infer<
	typeof resourceV2TransferEffectSchema
>;

export const resourceV2BoundAdjustmentSchema = z.object({
	kind: z.enum([
		'resource:lower-bound:increase',
		'resource:upper-bound:increase',
	]),
	resourceId: z.string(),
	amount: z.number(),
	reconciliation: resourceV2ReconciliationStrategySchema,
});

export type ResourceV2BoundAdjustmentDefinition = z.infer<
	typeof resourceV2BoundAdjustmentSchema
>;

export const resourceV2LimitedParentFlagSetSchema = z
	.array(z.string())
	.superRefine((ids, ctx) => {
		const seen = new Set<string>();
		ids.forEach((id, index) => {
			if (seen.has(id)) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: [index],
					message: 'ResourceV2 limited parent ids must be unique.',
				});
				return;
			}
			seen.add(id);
		});
	});

export type ResourceV2LimitedParentFlagSet = z.infer<
	typeof resourceV2LimitedParentFlagSetSchema
>;

export const resourceV2DefinitionCollectionSchema = z
	.object({
		definitions: z.array(resourceV2DefinitionSchema),
		groups: z.array(resourceV2GroupDefinitionSchema).optional(),
		limitedParentIds: resourceV2LimitedParentFlagSetSchema.optional(),
	})
	.superRefine((collection, ctx) => {
		const definitionIds = new Set<string>();
		collection.definitions.forEach((definition, index) => {
			if (definitionIds.has(definition.id)) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['definitions', index, 'id'],
					message: 'ResourceV2 definitions must define unique ids.',
				});
				return;
			}
			definitionIds.add(definition.id);
		});

		const parentIds = new Set<string>();
		collection.groups?.forEach((group, groupIndex) => {
			if (parentIds.has(group.parent.id)) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['groups', groupIndex, 'parent', 'id'],
					message: 'ResourceV2 group parents must define unique ids.',
				});
				return;
			}
			parentIds.add(group.parent.id);
		});

		collection.definitions.forEach((definition, index) => {
			const parent = definition.group?.parent;
			if (!parent) {
				return;
			}
			parentIds.add(parent.id);
			if (parent.limited !== true) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['definitions', index, 'group', 'parent', 'limited'],
					message: 'ResourceV2 group parents must be limited resources.',
				});
			}
		});

		const limitedParentIds = new Set(collection.limitedParentIds ?? []);

		parentIds.forEach((parentId) => {
			if (!limitedParentIds.has(parentId)) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['limitedParentIds'],
					message: `Missing limited parent flag for ${parentId}.`,
				});
			}
		});

		limitedParentIds.forEach((parentId) => {
			if (!parentIds.has(parentId)) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['limitedParentIds'],
					message: `Unknown limited parent id ${parentId}.`,
				});
			}
		});
	});

export type ResourceV2DefinitionCollection = z.infer<
	typeof resourceV2DefinitionCollectionSchema
>;
