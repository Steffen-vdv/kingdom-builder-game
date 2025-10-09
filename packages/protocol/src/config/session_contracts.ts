import { z } from 'zod';
import {
	actionSchema,
	buildingSchema,
	developmentSchema,
	gameConfigSchema,
	populationSchema,
	resourceDefinitionSchema,
} from './schema';
import type {
	SessionAdvanceRequest,
	SessionAdvanceResponse,
	SessionCreateRequest,
	SessionCreateResponse,
	SessionIdentifier,
	SessionPlayerNameMap,
	SessionSetDevModeRequest,
	SessionSetDevModeResponse,
	SessionStateResponse,
	SessionRegistries,
} from '../session/contracts';
import type { SessionAdvanceResult, SessionSnapshot } from '../session';

export const sessionIdSchema = z.string().min(1);

export const sessionPlayerNameMapSchema = z
	.record(z.string(), z.string().min(1))
	.transform((value) => value as SessionPlayerNameMap);

export const sessionCreateRequestSchema = z.object({
	devMode: z.boolean().optional(),
	config: gameConfigSchema.optional(),
	playerNames: sessionPlayerNameMapSchema.optional(),
});

const sessionRegistryEntrySchema = <Definition extends z.ZodTypeAny>(
	definitionSchema: Definition,
) =>
	z.object({
		id: z.string(),
		definition: definitionSchema,
	});

const sessionRegistrySchema = <Definition extends z.ZodTypeAny>(
	definitionSchema: Definition,
) => z.array(sessionRegistryEntrySchema(definitionSchema));

export const sessionRegistriesSchema = z.object({
	actions: sessionRegistrySchema(actionSchema),
	buildings: sessionRegistrySchema(buildingSchema),
	developments: sessionRegistrySchema(developmentSchema),
	populations: sessionRegistrySchema(populationSchema),
	resources: sessionRegistrySchema(resourceDefinitionSchema),
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

export const sessionAdvanceResponseSchema = sessionCreateResponseSchema.extend({
	advance: z.custom<SessionAdvanceResult>(),
});

export const sessionSetDevModeRequestSchema = z.object({
	sessionId: sessionIdSchema,
	enabled: z.boolean(),
});

export const sessionSetDevModeResponseSchema = sessionCreateResponseSchema;

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
type _SessionRegistriesMatches = Expect<
	Equal<z.infer<typeof sessionRegistriesSchema>, SessionRegistries>
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
