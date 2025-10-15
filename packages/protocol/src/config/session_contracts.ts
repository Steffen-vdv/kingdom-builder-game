import { z } from 'zod';
import {
	actionEffectGroupSchema,
	actionSchema,
	buildingSchema,
	developmentSchema,
	gameConfigSchema,
	populationSchema,
	requirementSchema,
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
	SessionActionCostRequest,
	SessionActionCostResponse,
	SessionActionRequirementRequest,
	SessionActionRequirementResponse,
	SessionActionOptionsRequest,
	SessionActionOptionsResponse,
	SessionRunAiRequest,
	SessionRunAiResponse,
	SessionSimulateRequest,
	SessionSimulateResponse,
} from '../session/contracts';
import type {
	SessionAdvanceResult,
	SessionPlayerId,
	SessionSnapshot,
	SessionActionCostMap,
	SessionActionRequirementList,
	SimulateUpcomingPhasesOptions,
	SimulateUpcomingPhasesResult,
} from '../session';
import type { ActionParametersPayload } from '../actions/contracts';

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

const sessionRegistriesSchema = z
	.object({
		actions: serializedRegistrySchema(actionSchema),
		buildings: serializedRegistrySchema(buildingSchema),
		developments: serializedRegistrySchema(developmentSchema),
		populations: serializedRegistrySchema(populationSchema),
		resources: serializedRegistrySchema(resourceDefinitionSchema),
	})
	.transform((value) => value as SessionRegistriesPayload);

export const sessionIdSchema = z.string().min(1);

export const sessionPlayerNameMapSchema = z
	.record(z.string(), z.string().min(1))
	.transform((value) => value as SessionPlayerNameMap);

const sessionPlayerIdSchema = z
	.union([z.literal('A'), z.literal('B')])
	.transform((value) => value as SessionPlayerId);

const actionEffectChoiceSchema = z.object({
	optionId: z.string(),
	params: z.record(z.string(), z.unknown()).optional(),
});

const actionChoiceMapSchema = z.record(z.string(), actionEffectChoiceSchema);

const actionParametersPayloadSchema = z
	.object({
		choices: actionChoiceMapSchema.optional(),
	})
	.passthrough()
	.transform((value) => value as ActionParametersPayload);

const sessionActionCostMapSchema = z
	.record(z.string(), z.number())
	.transform((value) => value as SessionActionCostMap);

const sessionRequirementFailureSchema = z.object({
	requirement: requirementSchema,
	details: z.record(z.string(), z.unknown()).optional(),
	message: z.string().optional(),
});

const sessionActionRequirementListSchema = z
	.array(sessionRequirementFailureSchema)
	.transform((value) => value as SessionActionRequirementList);

const simulateUpcomingPhasesIdsSchema = z.object({
	growth: z.string(),
	upkeep: z.string(),
});

const simulateUpcomingPhasesOptionsSchema = z
	.object({
		phaseIds: simulateUpcomingPhasesIdsSchema.optional(),
		maxIterations: z.number().optional(),
	})
	.transform((value) => value as SimulateUpcomingPhasesOptions);

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

export const sessionActionCostRequestSchema = z.object({
	sessionId: sessionIdSchema,
	actionId: z.string().min(1),
	params: actionParametersPayloadSchema.optional(),
});

export const sessionActionCostResponseSchema = z.object({
	sessionId: sessionIdSchema,
	costs: sessionActionCostMapSchema,
});

export const sessionActionRequirementRequestSchema = z.object({
	sessionId: sessionIdSchema,
	actionId: z.string().min(1),
	params: actionParametersPayloadSchema.optional(),
});

export const sessionActionRequirementResponseSchema = z.object({
	sessionId: sessionIdSchema,
	requirements: sessionActionRequirementListSchema,
});

export const sessionActionOptionsRequestSchema = z.object({
	sessionId: sessionIdSchema,
	actionId: z.string().min(1),
});

export const sessionActionOptionsResponseSchema = z.object({
	sessionId: sessionIdSchema,
	groups: z.array(actionEffectGroupSchema),
});

export const sessionRunAiRequestSchema = z.object({
	sessionId: sessionIdSchema,
	playerId: sessionPlayerIdSchema,
});

export const sessionRunAiResponseSchema = z.object({
	sessionId: sessionIdSchema,
	snapshot: z.custom<SessionSnapshot>(),
	registries: sessionRegistriesSchema,
	ranTurn: z.boolean(),
});

export const sessionSimulateRequestSchema = z.object({
	sessionId: sessionIdSchema,
	playerId: sessionPlayerIdSchema,
	options: simulateUpcomingPhasesOptionsSchema.optional(),
});

export const sessionSimulateResponseSchema = z.object({
	sessionId: sessionIdSchema,
	result: z.custom<SimulateUpcomingPhasesResult>(),
});

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

type _ActionParametersPayloadSchemaMatches = Expect<
	Equal<z.infer<typeof actionParametersPayloadSchema>, ActionParametersPayload>
>;

type _SessionActionCostMapSchemaMatches = Expect<
	Equal<z.infer<typeof sessionActionCostMapSchema>, SessionActionCostMap>
>;

type _SessionActionRequirementListSchemaMatches = Expect<
	Equal<
		z.infer<typeof sessionActionRequirementListSchema>,
		SessionActionRequirementList
	>
>;

type _SessionActionCostRequestMatches = Expect<
	Equal<
		z.infer<typeof sessionActionCostRequestSchema>,
		SessionActionCostRequest
	>
>;

type _SessionActionCostResponseMatches = Expect<
	Equal<
		z.infer<typeof sessionActionCostResponseSchema>,
		SessionActionCostResponse
	>
>;

type _SessionActionRequirementRequestMatches = Expect<
	Equal<
		z.infer<typeof sessionActionRequirementRequestSchema>,
		SessionActionRequirementRequest
	>
>;

type _SessionActionRequirementResponseMatches = Expect<
	Equal<
		z.infer<typeof sessionActionRequirementResponseSchema>,
		SessionActionRequirementResponse
	>
>;

type _SessionActionOptionsRequestMatches = Expect<
	Equal<
		z.infer<typeof sessionActionOptionsRequestSchema>,
		SessionActionOptionsRequest
	>
>;

type _SessionActionOptionsResponseMatches = Expect<
	Equal<
		z.infer<typeof sessionActionOptionsResponseSchema>,
		SessionActionOptionsResponse
	>
>;

type _SessionRunAiRequestMatches = Expect<
	Equal<z.infer<typeof sessionRunAiRequestSchema>, SessionRunAiRequest>
>;

type _SessionRunAiResponseMatches = Expect<
	Equal<z.infer<typeof sessionRunAiResponseSchema>, SessionRunAiResponse>
>;

type _SessionSimulateRequestMatches = Expect<
	Equal<z.infer<typeof sessionSimulateRequestSchema>, SessionSimulateRequest>
>;

type _SessionSimulateResponseMatches = Expect<
	Equal<z.infer<typeof sessionSimulateResponseSchema>, SessionSimulateResponse>
>;

type _SimulateUpcomingPhasesOptionsSchemaMatches = Expect<
	Equal<
		z.infer<typeof simulateUpcomingPhasesOptionsSchema>,
		SimulateUpcomingPhasesOptions
	>
>;
