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
import type {
	SessionIdentifier,
	SessionMetadataSnapshot,
	SessionMetadataSnapshotResponse,
	SessionPlayerNameMap,
	SessionRegistriesPayload,
	SessionRuntimeConfigResponse,
} from '../../session/contracts';
import type { SessionPlayerId } from '../../session';
import {
	resourceV2BoundsSchema,
	resourceV2DefinitionSchema,
	resourceV2GroupDefinitionSchema,
	resourceV2GroupParentSchema,
	resourceV2TierStepSchema,
	resourceV2TierTrackSchema,
} from '../../resourceV2/definitions';
import type {
	SessionResourceMetadataSnapshot,
	SessionResourceRegistryPayload,
} from '../../session/resourceV2';

const resourceV2DisplaySchema = resourceV2DefinitionSchema.shape.display;

const sessionResourceValueDescriptorSchema = resourceV2DisplaySchema.extend({
	key: z.string(),
	groupId: z.string().optional(),
	percent: z.boolean().optional(),
	tags: z.array(z.string()).optional(),
	bounds: resourceV2BoundsSchema.optional(),
});

const sessionResourceGroupParentSchema = resourceV2GroupParentSchema.omit({
	limited: true,
});

const sessionResourceGroupSchema = resourceV2GroupDefinitionSchema.extend({
	parent: sessionResourceGroupParentSchema,
	members: z.array(z.string()),
	order: z.number(),
});

const sessionResourceGlobalCostSchema = z.object({
	resourceId: z.string(),
	amount: z.number(),
});

const sessionResourceTierStepSchema = resourceV2TierStepSchema
	.pick({ id: true, min: true, max: true })
	.extend({
		active: z.boolean(),
		display: resourceV2TierStepSchema.shape.display.optional(),
	});

const sessionResourceTierSchema = resourceV2TierTrackSchema
	.pick({ id: true, display: true })
	.extend({
		currentStepId: z.string().optional(),
		steps: z.array(sessionResourceTierStepSchema),
	});

const sessionResourceValueMetadataSchema = z.object({
	descriptor: sessionResourceValueDescriptorSchema,
	tier: sessionResourceTierSchema.optional(),
	globalActionCost: sessionResourceGlobalCostSchema.optional(),
});

const sessionResourceMetadataValuesSchema = z.record(
	z.string(),
	sessionResourceValueMetadataSchema,
);

const sessionResourceDisplayNodeSchema = z.union([
	z.object({
		type: z.literal('parent'),
		key: z.string(),
		parent: sessionResourceGroupParentSchema,
		group: sessionResourceGroupSchema,
	}),
	z.object({
		type: z.literal('value'),
		key: z.string(),
		descriptor: sessionResourceValueDescriptorSchema,
		group: sessionResourceGroupSchema.optional(),
		tier: sessionResourceTierSchema.optional(),
		globalCost: sessionResourceGlobalCostSchema.optional(),
	}),
]);

const sessionResourceRecentGainSchema = z.object({
	key: z.string(),
	amount: z.number(),
});

const sessionResourceMetadataSchema = z
	.object({
		values: sessionResourceMetadataValuesSchema,
		groups: z.record(z.string(), sessionResourceGroupSchema),
		tiers: z.record(z.string(), sessionResourceTierSchema),
		orderedDisplay: z.array(sessionResourceDisplayNodeSchema),
		recentGains: z.array(sessionResourceRecentGainSchema),
	})
	.transform((value) => value as SessionResourceMetadataSnapshot);

const serializedRegistrySchema = <Shape extends ZodRawShape>(
	schema: ZodObject<Shape>,
) => z.record(z.string(), schema.passthrough());

const sessionResourceRegistrySchema = z
	.object({
		definitions: serializedRegistrySchema(resourceV2DefinitionSchema),
		groups: serializedRegistrySchema(resourceV2GroupDefinitionSchema),
		globalCost: sessionResourceGlobalCostSchema.optional(),
	})
	.transform((value) => value as SessionResourceRegistryPayload);

export const sessionRegistriesSchema = z
	.object({
		actions: serializedRegistrySchema(actionSchema),
		buildings: serializedRegistrySchema(buildingSchema),
		developments: serializedRegistrySchema(developmentSchema),
		populations: serializedRegistrySchema(populationSchema),
		resources: sessionResourceRegistrySchema,
		actionCategories: serializedRegistrySchema(actionCategorySchema).optional(),
	})
	.transform((value) => value as SessionRegistriesPayload);

export const runtimeConfigResponseSchema = z
	.object({
		phases: z.array(phaseSchema),
		start: startConfigSchema,
		rules: ruleSetSchema,
		resources: sessionResourceRegistrySchema,
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
		values: sessionMetadataDescriptorRecordSchema.optional(),
		resources: sessionResourceMetadataSchema,
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
