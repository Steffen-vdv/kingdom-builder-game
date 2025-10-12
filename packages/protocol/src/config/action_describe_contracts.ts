import { z } from 'zod';
import {
	actionParametersSchema,
	actionRequirementFailureSchema,
} from './action_contracts';
import { sessionIdSchema } from './session_contracts';
import type {
	ActionDescribeRequest,
	ActionDescribeResponse,
} from '../actions/contracts';
import type {
	SessionActionCostMap,
	SessionActionDefinitionSummary,
	SessionActionRequirementList,
} from '../session';

const actionCostMapSchema = z
	.record(z.number())
	.transform((value) => value as SessionActionCostMap);

const actionDefinitionSummarySchema = z
	.object({
		id: z.string(),
		name: z.string(),
		system: z.boolean().optional(),
	})
	.transform((value) => value as SessionActionDefinitionSummary);

const actionRequirementListSchema = z
	.array(actionRequirementFailureSchema)
	.transform((value) => value as SessionActionRequirementList);

export const actionDescribeRequestSchema = z.object({
	sessionId: sessionIdSchema,
	actionId: z.string().min(1),
	params: actionParametersSchema.optional(),
});

export const actionDescribeResponseSchema = z.object({
	sessionId: sessionIdSchema,
	actionId: z.string().min(1),
	definition: actionDefinitionSummarySchema.optional(),
	costs: actionCostMapSchema,
	requirements: actionRequirementListSchema,
});

type Equal<X, Y> =
	(<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
		? true
		: false;
type Expect<T extends true> = T;

type _ActionDescribeRequestMatches = Expect<
	Equal<z.infer<typeof actionDescribeRequestSchema>, ActionDescribeRequest>
>;
type _ActionDescribeResponseMatches = Expect<
	Equal<z.infer<typeof actionDescribeResponseSchema>, ActionDescribeResponse>
>;
