import { z } from 'zod';
import { gameConfigSchema } from '../schema';
import type {
	SessionAdvanceRequest,
	SessionAdvanceResponse,
	SessionCreateRequest,
	SessionCreateResponse,
	SessionSetDevModeRequest,
	SessionSetDevModeResponse,
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
	devMode: z.boolean().optional(),
	config: gameConfigSchema.optional(),
	playerNames: sessionPlayerNameMapSchema.optional(),
});

export const sessionCreateResponseSchema = z.object({
	sessionId: sessionIdSchema,
	snapshot: z.custom<SessionSnapshot>(
		(value): value is SessionSnapshot => true,
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
		(value): value is SessionSnapshot => true,
	),
	advance: z.custom<SessionAdvanceResult>(
		(value): value is SessionAdvanceResult => true,
	),
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
