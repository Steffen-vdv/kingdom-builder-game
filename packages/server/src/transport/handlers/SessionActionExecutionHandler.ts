import {
	actionExecuteRequestSchema,
	actionExecuteResponseSchema,
	actionExecuteErrorResponseSchema,
} from '@kingdom-builder/protocol';
import type {
	ActionExecuteErrorResponse,
	ActionExecuteSuccessResponse,
} from '@kingdom-builder/protocol';
import type {
	TransportHttpResponse,
	TransportRequest,
} from '../TransportTypes.js';
import type { AuthContext, AuthRole } from '../../auth/AuthContext.js';
import type { SessionManager } from '../../session/SessionManager.js';
import { parseActionParameters } from '../actionParameterHelpers.js';
import { normalizeActionTraces } from '../engineTraceNormalizer.js';
import { extractRequirementFailures } from '../extractRequirementFailures.js';
import { mergeSessionMetadata } from '../../session/mergeSessionMetadata.js';

type AuthorizationCallback = (role: AuthRole) => AuthContext;

type AttachHttpStatus = <T extends object>(
	payload: T,
	status: number,
) => TransportHttpResponse<T>;

interface SessionActionExecutionContext {
	request: TransportRequest;
	requireAuthorization: AuthorizationCallback;
}

export class SessionActionExecutionHandler {
	private readonly sessionManager: SessionManager;

	private readonly attachHttpStatus: AttachHttpStatus;

	public constructor(options: {
		sessionManager: SessionManager;
		attachHttpStatus: AttachHttpStatus;
	}) {
		this.sessionManager = options.sessionManager;
		this.attachHttpStatus = options.attachHttpStatus;
	}

	public async handle(
		context: SessionActionExecutionContext,
	): Promise<
		| TransportHttpResponse<ActionExecuteSuccessResponse>
		| TransportHttpResponse<ActionExecuteErrorResponse>
	> {
		const parsed = actionExecuteRequestSchema.safeParse(context.request.body);
		if (!parsed.success) {
			const response = actionExecuteErrorResponseSchema.parse({
				status: 'error',
				error: 'Invalid action request.',
			}) as ActionExecuteErrorResponse;
			return this.attachHttpStatus(response, 400);
		}
		context.requireAuthorization('session:advance');
		const { sessionId, actionId, params } = parsed.data;
		const normalizedParams = parseActionParameters(
			params,
			'Invalid action request.',
		);
		const session = this.sessionManager.getSession(sessionId);
		if (!session) {
			const response = actionExecuteErrorResponseSchema.parse({
				status: 'error',
				error: `Session "${sessionId}" was not found.`,
			}) as ActionExecuteErrorResponse;
			return this.attachHttpStatus(response, 404);
		}
		try {
			const rawCosts = session.getActionCosts(actionId, normalizedParams);
			const costs: Record<string, number> = {};
			for (const [resourceKey, amount] of Object.entries(rawCosts)) {
				if (typeof amount === 'number') {
					costs[resourceKey] = amount;
				}
			}
			const result = await session.enqueue(() => {
				const traces = session.performAction(actionId, normalizedParams);
				const snapshot = session.getSnapshot();
				return { traces, snapshot };
			});
			const snapshot = structuredClone(result.snapshot);
			snapshot.metadata = mergeSessionMetadata({
				baseMetadata: this.sessionManager.getMetadata(),
				snapshotMetadata: snapshot.metadata,
			});
			const response = actionExecuteResponseSchema.parse({
				status: 'success',
				snapshot,
				costs,
				traces: normalizeActionTraces(result.traces),
			}) as ActionExecuteSuccessResponse;
			return this.attachHttpStatus(response, 200);
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
			return this.attachHttpStatus(response, 409);
		}
	}
}
