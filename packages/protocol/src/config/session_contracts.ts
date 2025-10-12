import { z } from 'zod';
import {
	actionSchema,
	buildingSchema,
	developmentSchema,
	gameConfigSchema,
	populationSchema,
} from './schema';
import type {
	SessionAdvanceRequest,
	SessionAdvanceResponse,
	SessionCreateRequest,
	SessionCreateResponse,
	SessionIdentifier,
	SessionPlayerNameMap,
	SessionRegistriesPayload,
	SessionSetDevModeRequest,
	SessionSetDevModeResponse,
	SessionStateResponse,
	SessionUpdatePlayerNameRequest,
	SessionUpdatePlayerNameResponse,
} from '../session/contracts';
import type {
	SessionAdvanceResult,
	SessionPlayerId,
	SessionSnapshot,
} from '../session';

const resourceDefinitionSchema = z.object({
	key: z.string(),
	icon: z.string().optional(),
	label: z.string().optional(),
	description: z.string().optional(),
	tags: z.array(z.string()).optional(),
});

const serializedRegistrySchema = <SchemaType extends z.ZodTypeAny>(
	schema: SchemaType,
) => z.record(z.string(), schema);

const metadataDescriptorSchema = z.object({
	label: z.string().optional(),
	icon: z.string().optional(),
	description: z.string().optional(),
});

const triggerMetadataSchema = z.object({
	label: z.string().optional(),
	icon: z.string().optional(),
	future: z.string().optional(),
	past: z.string().optional(),
});

const overviewListItemSchema = z.object({
	icon: z.string().optional(),
	label: z.string(),
	body: z.array(z.string()),
});

const overviewParagraphSectionSchema = z.object({
	kind: z.literal('paragraph'),
	id: z.string(),
	icon: z.string(),
	title: z.string(),
	span: z.boolean().optional(),
	paragraphs: z.array(z.string()),
});

const overviewListSectionSchema = z.object({
	kind: z.literal('list'),
	id: z.string(),
	icon: z.string(),
	title: z.string(),
	span: z.boolean().optional(),
	items: z.array(overviewListItemSchema),
});

const overviewSectionSchema = z.union([
	overviewParagraphSectionSchema,
	overviewListSectionSchema,
]);

const overviewHeroSchema = z.object({
	badgeIcon: z.string(),
	badgeLabel: z.string(),
	title: z.string(),
	intro: z.string(),
	paragraph: z.string(),
	tokens: z.record(z.string(), z.string()),
});

const overviewTokenCandidatesSchema = z.record(
	z.string(),
	z.record(z.string(), z.array(z.string())),
);

const overviewContentSchema = z.object({
	hero: overviewHeroSchema,
	sections: z.array(overviewSectionSchema),
	tokens: overviewTokenCandidatesSchema,
});

const registriesMetadataSchema = z.object({
	resources: z.record(z.string(), metadataDescriptorSchema),
	triggers: z.record(z.string(), triggerMetadataSchema),
	overviewContent: overviewContentSchema,
});

const sessionRegistriesSchema = z
	.object({
		actions: serializedRegistrySchema(actionSchema),
		buildings: serializedRegistrySchema(buildingSchema),
		developments: serializedRegistrySchema(developmentSchema),
		populations: serializedRegistrySchema(populationSchema),
		resources: serializedRegistrySchema(resourceDefinitionSchema),
		metadata: registriesMetadataSchema,
	})
	.transform((value) => value as SessionRegistriesPayload);

export const sessionIdSchema = z.string().min(1);

export const sessionPlayerNameMapSchema = z
	.record(z.string(), z.string().min(1))
	.transform((value) => value as SessionPlayerNameMap);

const sessionPlayerIdSchema = z
	.union([z.literal('A'), z.literal('B')])
	.transform((value) => value as SessionPlayerId);

export const sessionCreateRequestSchema = z.object({
	devMode: z.boolean().optional(),
	config: gameConfigSchema.optional(),
	playerNames: sessionPlayerNameMapSchema.optional(),
});

export const sessionCreateResponseSchema = z.object({
	sessionId: sessionIdSchema,
	snapshot: z.custom<SessionSnapshot>(),
	registries: sessionRegistriesSchema,
});

export const sessionStateResponseSchema = sessionCreateResponseSchema;

export const sessionAdvanceRequestSchema = z.object({
	sessionId: sessionIdSchema,
});

export const sessionAdvanceResponseSchema = z.object({
	sessionId: sessionIdSchema,
	snapshot: z.custom<SessionSnapshot>(),
	advance: z.custom<SessionAdvanceResult>(),
	registries: sessionRegistriesSchema,
});

export const sessionSetDevModeRequestSchema = z.object({
	sessionId: sessionIdSchema,
	enabled: z.boolean(),
});

export const sessionSetDevModeResponseSchema = sessionCreateResponseSchema;

export const sessionUpdatePlayerNameRequestSchema = z.object({
	sessionId: sessionIdSchema,
	playerId: sessionPlayerIdSchema,
	playerName: z.string().min(1),
});

export const sessionUpdatePlayerNameResponseSchema =
	sessionCreateResponseSchema;

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
type _SessionCreateRequestMatches = Expect<
	Equal<z.infer<typeof sessionCreateRequestSchema>, SessionCreateRequest>
>;
type _SessionCreateResponseMatches = Expect<
	Equal<z.infer<typeof sessionCreateResponseSchema>, SessionCreateResponse>
>;
type _SessionStateResponseMatches = Expect<
	Equal<z.infer<typeof sessionStateResponseSchema>, SessionStateResponse>
>;
type _SessionAdvanceRequestMatches = Expect<
	Equal<z.infer<typeof sessionAdvanceRequestSchema>, SessionAdvanceRequest>
>;
type _SessionAdvanceResponseMatches = Expect<
	Equal<z.infer<typeof sessionAdvanceResponseSchema>, SessionAdvanceResponse>
>;
type _SessionSetDevModeRequestMatches = Expect<
	Equal<
		z.infer<typeof sessionSetDevModeRequestSchema>,
		SessionSetDevModeRequest
	>
>;
type _SessionSetDevModeResponseMatches = Expect<
	Equal<
		z.infer<typeof sessionSetDevModeResponseSchema>,
		SessionSetDevModeResponse
	>
>;

type _SessionUpdatePlayerNameRequestMatches = Expect<
	Equal<
		z.infer<typeof sessionUpdatePlayerNameRequestSchema>,
		SessionUpdatePlayerNameRequest
	>
>;
type _SessionUpdatePlayerNameResponseMatches = Expect<
	Equal<
		z.infer<typeof sessionUpdatePlayerNameResponseSchema>,
		SessionUpdatePlayerNameResponse
	>
>;

type _SessionRegistriesSchemaMatches = Expect<
	Equal<z.infer<typeof sessionRegistriesSchema>, SessionRegistriesPayload>
>;
