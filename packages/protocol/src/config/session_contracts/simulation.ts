import { z } from 'zod';
import type {
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
type _SessionSimulateRequestMatches = Expect<
	Equal<z.infer<typeof sessionSimulateRequestSchema>, SessionSimulateRequest>
>;
type _SessionSimulateResponseMatches = Expect<
	Equal<z.infer<typeof sessionSimulateResponseSchema>, SessionSimulateResponse>
>;
