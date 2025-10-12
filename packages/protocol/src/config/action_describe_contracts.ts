import { z } from 'zod';
import { sessionIdSchema } from './session_contracts';
import { actionRequirementFailureSchema } from './action_contracts';
import type {
	SessionActionCostMap,
	SessionActionDefinitionSummary,
	SessionActionRequirementList,
} from '../session';

const actionDefinitionSummarySchema = z
	.object({
		id: z.string(),
		name: z.string(),
		system: z.boolean().optional(),
	})
	.transform((value) => value as SessionActionDefinitionSummary);

const actionCostMapSchema = z
	.record(z.string(), z.number())
	.transform((value) => value as SessionActionCostMap);

const actionRequirementListSchema = z
	.array(actionRequirementFailureSchema)
	.transform((value) => value as SessionActionRequirementList);

export const actionDescribeRequestSchema = z.object({
	sessionId: sessionIdSchema,
	actionId: z.string().min(1),
});

export const actionDescribeResponseSchema = z.object({
	sessionId: sessionIdSchema,
	actionId: z.string().min(1),
	definition: actionDefinitionSummarySchema,
	costs: actionCostMapSchema,
	requirements: actionRequirementListSchema,
});

export type ActionDescribeRequest = z.infer<typeof actionDescribeRequestSchema>;

export type ActionDescribeResponse = z.infer<
	typeof actionDescribeResponseSchema
>;
