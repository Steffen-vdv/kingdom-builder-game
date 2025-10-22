import { z } from 'zod';
import { actionEffectGroupSchema, requirementSchema } from '../schema';
import type {
	SessionActionCostRequest,
	SessionActionCostResponse,
	SessionActionOptionsRequest,
	SessionActionOptionsResponse,
	SessionActionRequirementRequest,
	SessionActionRequirementResponse,
} from '../../session/contracts';
import type {
	SessionActionCostMap,
	SessionActionRequirementList,
} from '../../session';
import type { ActionParametersPayload } from '../../actions/contracts';
import { sessionIdSchema, sessionPlayerIdSchema } from './shared';

const actionEffectChoiceSchema = z.object({
	optionId: z.string(),
	params: z.record(z.string(), z.unknown()).optional(),
});

const actionChoiceMapSchema = z.record(z.string(), actionEffectChoiceSchema);

const actionParametersPayloadSchema = z
	.object({
		choices: actionChoiceMapSchema.optional(),
	})
	.catchall(z.unknown())
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

export const sessionActionCostRequestSchema = z.object({
	sessionId: sessionIdSchema,
	actionId: z.string().min(1),
	params: actionParametersPayloadSchema.optional(),
	playerId: sessionPlayerIdSchema.optional(),
});

export const sessionActionCostResponseSchema = z.object({
	sessionId: sessionIdSchema,
	costs: sessionActionCostMapSchema,
});

export const sessionActionRequirementRequestSchema = z.object({
	sessionId: sessionIdSchema,
	actionId: z.string().min(1),
	params: actionParametersPayloadSchema.optional(),
	playerId: sessionPlayerIdSchema.optional(),
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

type Equal<X, Y> =
	(<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
		? true
		: false;
type Expect<T extends true> = T;

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
