import { z, type ZodObject, type ZodRawShape } from 'zod';
import {
	actionCategorySchema,
	actionSchema,
	buildingSchema,
	developmentSchema,
	populationSchema,
	phaseSchema,
	startConfigSchema,
	ruleSetSchema,
} from '../schema';
import {
	resourceV2DefinitionSchema,
	resourceV2GroupDefinitionSchema,
	resourceV2GroupParentSchema,
} from '../../resourceV2/definitions';
import type {
	SessionIdentifier,
	SessionMetadataSnapshot,
	SessionMetadataSnapshotResponse,
	SessionPlayerNameMap,
	SessionRegistriesPayload,
	SessionRuntimeConfigResponse,
} from '../../session/contracts';
import type { SessionPlayerId } from '../../session';

const serializedRegistrySchema = <Shape extends ZodRawShape>(
	schema: ZodObject<Shape>,
) => z.record(z.string(), schema.passthrough());

export const sessionRegistriesSchema = z
	.object({
		actions: serializedRegistrySchema(actionSchema),
		buildings: serializedRegistrySchema(buildingSchema),
		developments: serializedRegistrySchema(developmentSchema),
		populations: serializedRegistrySchema(populationSchema),
		resources: serializedRegistrySchema(resourceV2DefinitionSchema),
		resourceGroups: serializedRegistrySchema(resourceV2GroupDefinitionSchema),
		globalActionCostResourceId: z.string().nullable(),
		actionCategories: serializedRegistrySchema(actionCategorySchema).optional(),
	})
	.transform((value) => value as SessionRegistriesPayload);

export const runtimeConfigResponseSchema = z
	.object({
		phases: z.array(phaseSchema),
		start: startConfigSchema,
		rules: ruleSetSchema,
		resources: serializedRegistrySchema(resourceV2DefinitionSchema),
		resourceGroups: serializedRegistrySchema(resourceV2GroupDefinitionSchema),
		globalActionCostResourceId: z.string().nullable(),
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

const sessionResourceV2ValueDescriptorSchema = z
	.object({
		label: z.string().optional(),
		icon: z.string().optional(),
		description: z.string().optional(),
		order: z.number(),
		percent: z.boolean().optional(),
	})
	.passthrough();

const sessionResourceV2TierStepDisplaySchema = z
	.object({
		label: z.string().optional(),
		summaryToken: z.string().optional(),
	})
	.passthrough();

const sessionResourceV2TierStepStatusSchema = z
	.object({
		id: z.string(),
		min: z.number(),
		max: z.number().optional(),
		display: sessionResourceV2TierStepDisplaySchema.optional(),
		active: z.boolean(),
	})
	.passthrough();

const sessionResourceV2TierTrackDisplaySchema = z
	.object({
		title: z.string().optional(),
		summaryToken: z.string().optional(),
	})
	.passthrough();

const sessionResourceV2TierStatusSchema = z
	.object({
		trackId: z.string(),
		activeStepId: z.string().optional(),
		display: sessionResourceV2TierTrackDisplaySchema.optional(),
		steps: z.array(sessionResourceV2TierStepStatusSchema),
	})
	.passthrough();

const sessionResourceV2ValueMetadataSchema = z
	.object({
		descriptor: sessionResourceV2ValueDescriptorSchema,
		groupId: z.string().optional(),
		tier: sessionResourceV2TierStatusSchema.optional(),
	})
	.passthrough();

const sessionResourceV2MetadataMapSchema = z.record(
	z.string(),
	sessionResourceV2ValueMetadataSchema,
);

const sessionResourceV2GroupPresentationSchema = z
	.object({
		groupId: z.string(),
		parent: resourceV2GroupParentSchema,
		children: z.array(z.string()),
	})
	.passthrough();

const sessionResourceV2ValueEntrySchema = z
	.object({
		kind: z.literal('value'),
		resourceId: z.string(),
		descriptor: sessionResourceV2ValueDescriptorSchema,
	})
	.passthrough();

const sessionResourceV2GroupParentEntrySchema = z
	.object({
		kind: z.literal('group-parent'),
		resourceId: z.string(),
		groupId: z.string(),
		descriptor: resourceV2GroupParentSchema,
		children: z.array(z.string()),
	})
	.passthrough();

const sessionResourceV2OrderedValueEntrySchema = z.union([
	sessionResourceV2ValueEntrySchema,
	sessionResourceV2GroupParentEntrySchema,
]);

const sessionResourceV2MetadataSchema = z
	.object({
		descriptors: sessionResourceV2MetadataMapSchema,
		groups: z.array(sessionResourceV2GroupPresentationSchema).optional(),
		orderedValues: z.array(sessionResourceV2OrderedValueEntrySchema).optional(),
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
		values: sessionResourceV2MetadataSchema.optional(),
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
