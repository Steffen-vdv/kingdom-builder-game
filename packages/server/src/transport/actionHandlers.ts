import {
	actionDescribeRequestSchema,
	actionDescribeResponseSchema,
	actionExecuteRequestSchema,
	actionExecuteResponseSchema,
	actionExecuteErrorResponseSchema,
} from '@kingdom-builder/protocol';
import type {
	ActionDescribeResponse,
	ActionExecuteErrorResponse,
	ActionExecuteSuccessResponse,
} from '@kingdom-builder/protocol';
import { normalizeActionTraces } from './engineTraceNormalizer.js';
import { extractRequirementFailures } from './extractRequirementFailures.js';
import { TransportError } from './TransportTypes.js';
import type {
	TransportRequest,
	TransportHttpResponse,
} from './TransportTypes.js';
import type { EngineSession } from '@kingdom-builder/engine';

type AuthorizationCallback = () => void;

type SessionResolver = (sessionId: string) => EngineSession | undefined;

type SessionRequirement = (sessionId: string) => EngineSession;

type HttpStatusAttacher = <PayloadType extends object>(
	payload: PayloadType,
	status: number,
) => TransportHttpResponse<PayloadType>;

export async function handleExecuteAction({
	request,
	authorize,
	getSession,
	attachHttpStatus,
}: {
	request: TransportRequest;
	authorize: AuthorizationCallback;
	getSession: SessionResolver;
	attachHttpStatus: HttpStatusAttacher;
}): Promise<
	| TransportHttpResponse<ActionExecuteSuccessResponse>
	| TransportHttpResponse<ActionExecuteErrorResponse>
> {
	const parsed = actionExecuteRequestSchema.safeParse(request.body);
	if (!parsed.success) {
		const response = actionExecuteErrorResponseSchema.parse({
			status: 'error',
			error: 'Invalid action request.',
		}) as ActionExecuteErrorResponse;
		return attachHttpStatus<ActionExecuteErrorResponse>(response, 400);
	}
	authorize();
	const { sessionId, actionId, params } = parsed.data;
	const session = getSession(sessionId);
	if (!session) {
		const response = actionExecuteErrorResponseSchema.parse({
			status: 'error',
			error: `Session "${sessionId}" was not found.`,
		}) as ActionExecuteErrorResponse;
		return attachHttpStatus<ActionExecuteErrorResponse>(response, 404);
	}
	try {
		const rawCosts = session.getActionCosts(actionId, params as never);
		const costs: Record<string, number> = {};
		for (const [resourceKey, amount] of Object.entries(rawCosts)) {
			if (typeof amount === 'number') {
				costs[resourceKey] = amount;
			}
		}
		const result = await session.enqueue(() => {
			const traces = session.performAction(actionId, params as never);
			const snapshot = session.getSnapshot();
			return { traces, snapshot };
		});
		const response = actionExecuteResponseSchema.parse({
			status: 'success',
			snapshot: result.snapshot,
			costs,
			traces: normalizeActionTraces(result.traces),
		}) as ActionExecuteSuccessResponse;
		return attachHttpStatus<ActionExecuteSuccessResponse>(response, 200);
	} catch (error) {
		const failures = extractRequirementFailures(error);
		const message =
			error instanceof Error ? error.message : 'Action execution failed.';
		const base: ActionExecuteErrorResponse = {
			status: 'error',
			error: message,
		};
		if (failures.requirementFailure) {
			base.requirementFailure = failures.requirementFailure;
		}
		if (failures.requirementFailures) {
			base.requirementFailures = failures.requirementFailures;
		}
		const response = actionExecuteErrorResponseSchema.parse(
			base,
		) as ActionExecuteErrorResponse;
		return attachHttpStatus<ActionExecuteErrorResponse>(response, 409);
	}
}

export function handleDescribeAction({
	request,
	authorize,
	requireSession,
}: {
	request: TransportRequest;
	authorize: AuthorizationCallback;
	requireSession: SessionRequirement;
}): ActionDescribeResponse {
	authorize();
	const parsed = actionDescribeRequestSchema.safeParse(request.body);
	if (!parsed.success) {
		throw new TransportError(
			'INVALID_REQUEST',
			'Invalid action describe request.',
			{ issues: parsed.error.issues },
		);
	}
	const { sessionId, actionId, params } = parsed.data;
	const session = requireSession(sessionId);
	try {
		const definition = session.getActionDefinition(actionId);
		if (!definition) {
			throw new TransportError(
				'NOT_FOUND',
				`Action "${actionId}" was not found.`,
			);
		}
		return actionDescribeResponseSchema.parse({
			sessionId,
			actionId,
			definition,
			options: session.getActionOptions(actionId),
			costs: session.getActionCosts(actionId, params as never),
			requirements: session.getActionRequirements(actionId, params as never),
		}) as ActionDescribeResponse;
	} catch (error) {
		if (error instanceof TransportError) {
			throw error;
		}
		if (error instanceof Error && error.message.includes('Unknown id:')) {
			throw new TransportError(
				'NOT_FOUND',
				`Action "${actionId}" was not found.`,
				{ cause: error },
			);
		}
		throw error;
	}
}
