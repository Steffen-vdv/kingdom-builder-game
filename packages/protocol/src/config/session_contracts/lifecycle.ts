import { z } from 'zod';
import { gameConfigSchema } from '../schema';
import type { Equal, Expect } from '../schema_assertions';
import type {
	SessionAdvanceRequest,
	SessionAdvanceResponse,
	SessionCreateRequest,
	SessionCreateResponse,
	SessionStateResponse,
	SessionUpdatePlayerNameRequest,
	SessionUpdatePlayerNameResponse,
} from '../../session/contracts';
import type { SessionAdvanceResult, SessionSnapshot } from '../../session';
import {
	sessionIdSchema,
	sessionPlayerIdSchema,
	sessionPlayerNameMapSchema,
	sessionRegistriesSchema,
} from './shared';

export const sessionCreateRequestSchema = z.object({
	contentId: z.string().optional(),
	config: gameConfigSchema.optional(),
	playerNames: sessionPlayerNameMapSchema.optional(),
});

export const sessionCreateResponseSchema = z.object({
	sessionId: sessionIdSchema,
	snapshot: z.custom<SessionSnapshot>(
		(_value): _value is SessionSnapshot => true,
	),
	registries: sessionRegistriesSchema,
});

export const sessionStateResponseSchema = sessionCreateResponseSchema;

export const sessionAdvanceRequestSchema = z.object({
	sessionId: sessionIdSchema,
});

export const sessionAdvanceResponseSchema = z.object({
	sessionId: sessionIdSchema,
	snapshot: z.custom<SessionSnapshot>(
		(_value): _value is SessionSnapshot => true,
	),
	advance: z.custom<SessionAdvanceResult>(
		(_value): _value is SessionAdvanceResult => true,
	),
	registries: sessionRegistriesSchema,
});

export const sessionUpdatePlayerNameRequestSchema = z.object({
	sessionId: sessionIdSchema,
	playerId: sessionPlayerIdSchema,
	playerName: z.string().min(1),
});

export const sessionUpdatePlayerNameResponseSchema =
	sessionCreateResponseSchema;

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
