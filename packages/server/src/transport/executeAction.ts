import type { EngineSession } from '@kingdom-builder/engine';
import {
	actionExecuteErrorResponseSchema,
	actionExecuteResponseSchema,
} from '@kingdom-builder/protocol';
import type {
	ActionExecuteErrorResponse,
	ActionExecuteSuccessResponse,
} from '@kingdom-builder/protocol';
import { normalizeActionTraces } from './engineTraceNormalizer.js';
import { extractRequirementFailures } from './extractRequirementFailures.js';
import type { SessionManager } from '../session/SessionManager.js';
import type { TransportHttpResponse } from './TransportTypes.js';

export interface ExecuteSessionActionOptions {
	session: EngineSession;
	sessionManager: SessionManager;
	sessionId: string;
	actionId: string;
	params: unknown;
}

export type AttachStatusFn = <T extends object>(
	payload: T,
	status: number,
) => TransportHttpResponse<T>;

export async function executeSessionAction(
	options: ExecuteSessionActionOptions,
	attachStatus: AttachStatusFn,
): Promise<
	| TransportHttpResponse<ActionExecuteSuccessResponse>
	| TransportHttpResponse<ActionExecuteErrorResponse>
> {
	const { session, sessionManager, sessionId, actionId, params } = options;
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
			const snapshot = sessionManager.getSnapshot(sessionId);
			return { traces, snapshot };
		});
		const response = actionExecuteResponseSchema.parse({
			status: 'success',
			snapshot: result.snapshot,
			costs,
			traces: normalizeActionTraces(result.traces),
		}) as ActionExecuteSuccessResponse;
		return attachStatus<ActionExecuteSuccessResponse>(response, 200);
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
		return attachStatus<ActionExecuteErrorResponse>(response, 409);
	}
}
