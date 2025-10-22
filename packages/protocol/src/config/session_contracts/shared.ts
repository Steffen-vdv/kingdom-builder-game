import { z, type ZodObject, type ZodRawShape } from 'zod';
import {
	actionCategorySchema,
	actionSchema,
	buildingSchema,
	developmentSchema,
	phaseSchema,
	startConfigSchema,
	ruleSetSchema,
} from '../schema';
import {
	resourceV2DefinitionSchema,
	resourceV2GroupDefinitionSchema,
} from '../../resourceV2/definitions';
import type {
	SessionIdentifier,
	SessionMetadataSnapshot,
	SessionMetadataSnapshotResponse,
	SessionPlayerNameMap,
	SessionRegistriesPayload,
	SessionRuntimeConfigResponse,
} from '../../session/contracts';
import type {
	SessionPlayerId,
	SessionResourceV2MetadataSnapshot,
	SessionResourceV2OrderedDisplayEntry,
} from '../../session';

const serializedRegistrySchema = <Shape extends ZodRawShape>(
	schema: ZodObject<Shape>,
) => z.record(z.string(), schema.passthrough());

export const sessionRegistriesSchema = z
	.object({
		actions: serializedRegistrySchema(actionSchema),
		buildings: serializedRegistrySchema(buildingSchema),
		developments: serializedRegistrySchema(developmentSchema),
		values: serializedRegistrySchema(resourceV2DefinitionSchema),
		resourceGroups: serializedRegistrySchema(resourceV2GroupDefinitionSchema),
		globalActionCost: z
			.object({
				resourceId: z.string(),
				amount: z.number(),
			})
			.passthrough()
			.nullable(),
		actionCategories: serializedRegistrySchema(actionCategorySchema).optional(),
	})
	.transform((value) => value as SessionRegistriesPayload);

export const runtimeConfigResponseSchema = z
	.object({
		phases: z.array(phaseSchema),
		start: startConfigSchema,
		rules: ruleSetSchema,
		values: serializedRegistrySchema(resourceV2DefinitionSchema),
		resourceGroups: serializedRegistrySchema(resourceV2GroupDefinitionSchema),
		globalActionCost: z
			.object({
				resourceId: z.string(),
				amount: z.number(),
			})
			.passthrough()
			.nullable(),
		primaryIconId: z.string().nullable(),
	})
	.transform((value) => value as SessionRuntimeConfigResponse);

const sessionMetadataFormatSchema = z.union([
	z.string(),
	z
		.object({
			prefix: z.string().optional(),
			percent: z.boolean().optional(),
		})
		.passthrough(),
]);

const sessionMetadataDescriptorSchema = z
	.object({
		label: z.string().optional(),
		icon: z.string().optional(),
		description: z.string().optional(),
		displayAsPercent: z.boolean().optional(),
		format: sessionMetadataFormatSchema.optional(),
	})
	.passthrough();

const sessionMetadataDescriptorRecordSchema = z.record(
	z.string(),
	sessionMetadataDescriptorSchema,
);

const sessionResourceValueDescriptorSchema = z
	.object({
		id: z.string(),
		icon: z.string().optional(),
		label: z.string().optional(),
		description: z.string().optional(),
		order: z.number(),
		percent: z.boolean().optional(),
		groupId: z.string().optional(),
	})
	.passthrough();

const sessionResourceValueDescriptorMapSchema = z.record(
	z.string(),
	sessionResourceValueDescriptorSchema,
);

const sessionResourceGroupStructureSchema = z
	.object({
		id: z.string(),
		parentId: z.string(),
		parentOrder: z.number(),
		children: z.array(z.string()),
	})
	.passthrough();

const sessionResourceGroupStructureMapSchema = z.record(
	z.string(),
	sessionResourceGroupStructureSchema,
);

const sessionResourceTierStepStatusDisplaySchema = z
	.object({
		label: z.string().optional(),
		summaryToken: z.string().optional(),
	})
	.passthrough();

const sessionResourceTierStepStatusSchema = z
	.object({
		id: z.string(),
		min: z.number(),
		max: z.number().optional(),
		display: sessionResourceTierStepStatusDisplaySchema.optional(),
	})
	.passthrough();

const sessionResourceTierStatusSchema = z
	.object({
		trackId: z.string(),
		current: sessionResourceTierStepStatusSchema,
		previous: sessionResourceTierStepStatusSchema.optional(),
		next: sessionResourceTierStepStatusSchema.optional(),
	})
	.passthrough();

const sessionResourceTierStatusMapSchema = z.record(
	z.string(),
	sessionResourceTierStatusSchema,
);

const sessionResourceRecentGainSchema = z
	.object({
		resourceId: z.string(),
		amount: z.number(),
	})
	.passthrough();

const sessionResourceOrderedEntrySchema =
        z.union([
                z
                        .object({
                                kind: z.literal('resource'),
                                descriptor: sessionResourceValueDescriptorSchema,
				groupId: z.string().optional(),
			})
			.passthrough(),
		z
			.object({
				kind: z.literal('group-parent'),
				groupId: z.string(),
				parent: sessionResourceValueDescriptorSchema,
			})
			.passthrough(),
        ]);

const sessionResourceMetadataSchema = z
        .object({
                descriptors: sessionResourceValueDescriptorMapSchema,
                groups: sessionResourceGroupStructureMapSchema.optional(),
                ordered: z.array(sessionResourceOrderedEntrySchema).optional(),
                tiers: sessionResourceTierStatusMapSchema.optional(),
		recentGains: z.array(sessionResourceRecentGainSchema).optional(),
	})
	.passthrough();

const sessionPhaseStepMetadataSchema = z
	.object({
		id: z.string().optional(),
		label: z.string().optional(),
		icon: z.string().optional(),
		triggers: z.array(z.string()).optional(),
	})
	.passthrough();

const sessionPhaseMetadataSchema = z
	.object({
		id: z.string().optional(),
		label: z.string().optional(),
		icon: z.string().optional(),
		action: z.boolean().optional(),
		steps: z.array(sessionPhaseStepMetadataSchema).optional(),
	})
	.passthrough();

const sessionTriggerMetadataSchema = z
	.object({
		label: z.string().optional(),
		icon: z.string().optional(),
		future: z.string().optional(),
		past: z.string().optional(),
	})
	.passthrough();

const sessionOverviewHeroSchema = z
	.object({
		badgeIcon: z.string().optional(),
		badgeLabel: z.string().optional(),
		title: z.string().optional(),
		intro: z.string().optional(),
		paragraph: z.string().optional(),
		tokens: z.record(z.string(), z.string()).optional(),
	})
	.passthrough();

const sessionOverviewListItemSchema = z
	.object({
		icon: z.string().optional(),
		label: z.string(),
		body: z.array(z.string()),
	})
	.passthrough();

const sessionOverviewParagraphSectionSchema = z
	.object({
		kind: z.literal('paragraph'),
		id: z.string(),
		icon: z.string(),
		title: z.string(),
		span: z.boolean().optional(),
		paragraphs: z.array(z.string()),
	})
	.passthrough();

const sessionOverviewListSectionSchema = z
	.object({
		kind: z.literal('list'),
		id: z.string(),
		icon: z.string(),
		title: z.string(),
		span: z.boolean().optional(),
		items: z.array(sessionOverviewListItemSchema),
	})
	.passthrough();

const sessionOverviewSectionSchema = z.union([
	sessionOverviewParagraphSectionSchema,
	sessionOverviewListSectionSchema,
]);

const sessionOverviewTokenEntriesSchema = z.record(
	z.string(),
	z.array(z.string()),
);

const sessionOverviewTokenMapSchema = z
	.object({
		actions: sessionOverviewTokenEntriesSchema.optional(),
		phases: sessionOverviewTokenEntriesSchema.optional(),
		resources: sessionOverviewTokenEntriesSchema.optional(),
		stats: sessionOverviewTokenEntriesSchema.optional(),
		population: sessionOverviewTokenEntriesSchema.optional(),
		static: sessionOverviewTokenEntriesSchema.optional(),
	})
	.passthrough();

const sessionOverviewMetadataSchema = z
	.object({
		hero: sessionOverviewHeroSchema.optional(),
		sections: z.array(sessionOverviewSectionSchema).optional(),
		tokens: sessionOverviewTokenMapSchema.optional(),
	})
	.passthrough();

export const sessionMetadataSnapshotSchema = z
	.object({
		values: sessionResourceMetadataSchema.optional(),
		buildings: sessionMetadataDescriptorRecordSchema.optional(),
		developments: sessionMetadataDescriptorRecordSchema.optional(),
		phases: z.record(z.string(), sessionPhaseMetadataSchema).optional(),
		triggers: z.record(z.string(), sessionTriggerMetadataSchema).optional(),
		assets: sessionMetadataDescriptorRecordSchema.optional(),
		overview: sessionOverviewMetadataSchema.optional(),
	})
	.transform((value) => value as SessionMetadataSnapshot);

export const sessionMetadataSnapshotResponseSchema = z
	.object({
		registries: sessionRegistriesSchema,
		metadata: sessionMetadataSnapshotSchema,
	})
	.transform((value) => value as SessionMetadataSnapshotResponse);

export const sessionIdSchema = z.string().min(1);

export const sessionPlayerNameMapSchema = z
	.record(z.string(), z.string().min(1))
	.transform((value) => value as SessionPlayerNameMap);

export const sessionPlayerIdSchema = z
	.union([z.literal('A'), z.literal('B')])
	.transform((value) => value as SessionPlayerId);

type Equal<X, Y> =
	(<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
		? true
		: false;
type Expect<T extends true> = T;

type _SessionIdMatches = Expect<
	Equal<z.infer<typeof sessionIdSchema>, SessionIdentifier['sessionId']>
>;
type _SessionPlayerNameMapMatches = Expect<
	Equal<z.infer<typeof sessionPlayerNameMapSchema>, SessionPlayerNameMap>
>;
type _SessionRegistriesSchemaMatches = Expect<
	Equal<z.infer<typeof sessionRegistriesSchema>, SessionRegistriesPayload>
>;
type _SessionPlayerIdMatches = Expect<
	Equal<z.infer<typeof sessionPlayerIdSchema>, SessionPlayerId>
>;
type _RuntimeConfigResponseMatches = Expect<
	Equal<
		z.infer<typeof runtimeConfigResponseSchema>,
		SessionRuntimeConfigResponse
	>
>;
type _SessionMetadataSnapshotMatches = Expect<
	Equal<z.infer<typeof sessionMetadataSnapshotSchema>, SessionMetadataSnapshot>
>;
type _SessionMetadataSnapshotResponseMatches = Expect<
	Equal<
		z.infer<typeof sessionMetadataSnapshotResponseSchema>,
		SessionMetadataSnapshotResponse
	>
>;
