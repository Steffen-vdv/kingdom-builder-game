import { z } from 'zod';
import type {
	SessionRunAiAction,
	SessionRunAiRequest,
	SessionRunAiResponse,
	SessionSimulateRequest,
	SessionSimulateResponse,
} from '../../session/contracts';
import type {
	SessionSnapshot,
	SimulateUpcomingPhasesOptions,
	SimulateUpcomingPhasesResult,
} from '../../session';
import {
	sessionIdSchema,
	sessionPlayerIdSchema,
	sessionRegistriesSchema,
} from './shared';
import { actionParametersSchema, actionTraceSchema } from '../action_contracts';
import { sessionActionCostResponseSchema } from './actions';

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

const sessionRunAiActionSchema = z
	.object({
		actionId: z.string(),
		params: actionParametersSchema.optional(),
		costs: sessionActionCostResponseSchema.shape.costs,
		traces: z.array(actionTraceSchema),
	})
	.transform((value) => value as SessionRunAiAction);

export const sessionRunAiRequestSchema = z.object({
	sessionId: sessionIdSchema,
	playerId: sessionPlayerIdSchema,
});

export const sessionRunAiResponseSchema = z.object({
	sessionId: sessionIdSchema,
	snapshot: z.custom<SessionSnapshot>(
		(value): value is SessionSnapshot => true,
	),
	registries: sessionRegistriesSchema,
	ranTurn: z.boolean(),
	actions: z.array(sessionRunAiActionSchema),
	phaseComplete: z.boolean(),
});

export const sessionSimulateRequestSchema = z.object({
	sessionId: sessionIdSchema,
	playerId: sessionPlayerIdSchema,
	options: simulateUpcomingPhasesOptionsSchema.optional(),
});

export const sessionSimulateResponseSchema = z.object({
	sessionId: sessionIdSchema,
	result: z.custom<SimulateUpcomingPhasesResult>(
		(value): value is SimulateUpcomingPhasesResult => true,
	),
});

type Equal<X, Y> =
	(<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
		? true
		: false;
type Expect<T extends true> = T;

type _SimulateUpcomingPhasesOptionsSchemaMatches = Expect<
	Equal<
		z.infer<typeof simulateUpcomingPhasesOptionsSchema>,
		SimulateUpcomingPhasesOptions
	>
>;
type _SessionRunAiRequestMatches = Expect<
	Equal<z.infer<typeof sessionRunAiRequestSchema>, SessionRunAiRequest>
>;
type _SessionRunAiResponseMatches = Expect<
	Equal<z.infer<typeof sessionRunAiResponseSchema>, SessionRunAiResponse>
>;
type _SessionRunAiActionMatches = Expect<
	Equal<z.infer<typeof sessionRunAiActionSchema>, SessionRunAiAction>
>;
type _SessionSimulateRequestMatches = Expect<
	Equal<z.infer<typeof sessionSimulateRequestSchema>, SessionSimulateRequest>
>;
type _SessionSimulateResponseMatches = Expect<
	Equal<z.infer<typeof sessionSimulateResponseSchema>, SessionSimulateResponse>
>;
