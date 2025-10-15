import { z } from 'zod';
import { requirementSchema } from './schema';
import { sessionIdSchema } from './session_contracts';
import type {
	ActionChoiceMap,
	ActionEffectChoice,
	ActionExecuteErrorResponse,
	ActionExecuteRequest,
	ActionExecuteResponse,
	ActionExecuteSuccessResponse,
	ActionParametersPayload,
	ActionPlayerSnapshot,
	ActionTrace,
	ActionTraceLandSnapshot,
} from '../actions/contracts';
import type {
	SessionPassiveSummary,
	SessionRequirementFailure,
	SessionSnapshot,
} from '../session';

const passiveSourceMetadataSchema = z.object({
	type: z.string(),
	id: z.string(),
	icon: z.string().optional(),
	labelToken: z.string().optional(),
});

const passiveRemovalMetadataSchema = z.object({
	token: z.string().optional(),
	text: z.string().optional(),
});

const passiveMetadataSchema = z.object({
	source: passiveSourceMetadataSchema.optional(),
	removal: passiveRemovalMetadataSchema.optional(),
});

const sessionPassiveSummarySchema = z.object({
	id: z.string(),
	name: z.string().optional(),
	icon: z.string().optional(),
	detail: z.string().optional(),
	meta: passiveMetadataSchema.optional(),
});

export const actionEffectChoiceSchema = z.object({
	optionId: z.string(),
	params: z.record(z.string(), z.unknown()).optional(),
});

export const actionChoiceMapSchema = z.record(
	z.string(),
	actionEffectChoiceSchema,
);

export const actionParametersSchema = z
	.object({
		choices: actionChoiceMapSchema.optional(),
	})
	.and(z.record(z.string(), z.unknown()));

export const actionTraceLandSnapshotSchema = z.object({
	id: z.string(),
	slotsMax: z.number(),
	slotsUsed: z.number(),
	developments: z.array(z.string()),
});

export const actionPlayerSnapshotSchema = z.object({
	resources: z.record(z.string(), z.number()),
	stats: z.record(z.string(), z.number()),
	buildings: z.array(z.string()),
	lands: z.array(actionTraceLandSnapshotSchema),
	passives: z.array(sessionPassiveSummarySchema),
});

export const actionTraceSchema = z.object({
	id: z.string(),
	before: actionPlayerSnapshotSchema,
	after: actionPlayerSnapshotSchema,
});

export const actionRequirementFailureSchema = z.object({
	requirement: requirementSchema,
	details: z.record(z.string(), z.unknown()).optional(),
	message: z.string().optional(),
});

export const actionExecuteRequestSchema = z.object({
	sessionId: sessionIdSchema,
	actionId: z.string().min(1),
	params: actionParametersSchema.optional(),
});

export const actionExecuteSuccessResponseSchema = z.object({
	status: z.literal('success'),
	snapshot: z.custom<SessionSnapshot>(),
	costs: z.record(z.string(), z.number()),
	traces: z.array(actionTraceSchema),
});

export const actionExecuteErrorResponseSchema = z.object({
	status: z.literal('error'),
	error: z.string(),
	requirementFailure: actionRequirementFailureSchema.optional(),
	requirementFailures: z.array(actionRequirementFailureSchema).optional(),
	fatal: z.boolean().optional(),
});

export const actionExecuteResponseSchema = z.union([
	actionExecuteSuccessResponseSchema,
	actionExecuteErrorResponseSchema,
]);

type Equal<X, Y> =
	(<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
		? true
		: false;
type Expect<T extends true> = T;

type _SessionPassiveSummaryMatches = Expect<
	Equal<z.infer<typeof sessionPassiveSummarySchema>, SessionPassiveSummary>
>;
type _ActionEffectChoiceMatches = Expect<
	Equal<z.infer<typeof actionEffectChoiceSchema>, ActionEffectChoice>
>;
type _ActionChoiceMapMatches = Expect<
	Equal<z.infer<typeof actionChoiceMapSchema>, ActionChoiceMap>
>;
type _ActionParametersMatches = Expect<
	Equal<z.infer<typeof actionParametersSchema>, ActionParametersPayload>
>;
type _ActionTraceLandSnapshotMatches = Expect<
	Equal<z.infer<typeof actionTraceLandSnapshotSchema>, ActionTraceLandSnapshot>
>;
type _ActionPlayerSnapshotMatches = Expect<
	Equal<z.infer<typeof actionPlayerSnapshotSchema>, ActionPlayerSnapshot>
>;
type _ActionTraceMatches = Expect<
	Equal<z.infer<typeof actionTraceSchema>, ActionTrace>
>;
type _ActionRequirementFailureMatches = Expect<
	Equal<
		z.infer<typeof actionRequirementFailureSchema>,
		SessionRequirementFailure
	>
>;
type _ActionExecuteRequestMatches = Expect<
	Equal<z.infer<typeof actionExecuteRequestSchema>, ActionExecuteRequest>
>;
type _ActionExecuteSuccessMatches = Expect<
	Equal<
		z.infer<typeof actionExecuteSuccessResponseSchema>,
		ActionExecuteSuccessResponse
	>
>;
type _ActionExecuteErrorMatches = Expect<
	Equal<
		z.infer<typeof actionExecuteErrorResponseSchema>,
		ActionExecuteErrorResponse
	>
>;
type _ActionExecuteResponseMatches = Expect<
	Equal<z.infer<typeof actionExecuteResponseSchema>, ActionExecuteResponse>
>;
