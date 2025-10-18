import type {
	ActionExecuteErrorResponse,
	ActionExecuteSuccessResponse,
} from '@kingdom-builder/protocol/actions';
import { SessionMirroringError } from './sessionErrors';
import { updateSessionSnapshot } from './sessionStateStore';

type ActionExecutionFailure = Error & {
	requirementFailure?: ActionExecuteErrorResponse['requirementFailure'];
	requirementFailures?: ActionExecuteErrorResponse['requirementFailures'];
};

export function normalizeActionError(
	error: unknown,
): ActionExecuteErrorResponse {
	const failure = error as ActionExecutionFailure;
	const response: ActionExecuteErrorResponse = {
		status: 'error',
		error: failure?.message ?? 'Action failed.',
	};
	if (failure?.requirementFailure) {
		response.requirementFailure = failure.requirementFailure;
	}
	if (failure?.requirementFailures) {
		response.requirementFailures = failure.requirementFailures;
	}
	if (!response.requirementFailure && !response.requirementFailures) {
		response.fatal = true;
	}
	return response;
}

export function applyActionSnapshot(
	sessionId: string,
	response: ActionExecuteSuccessResponse,
): void {
	try {
		updateSessionSnapshot(sessionId, response.snapshot);
	} catch (cause) {
		throw new SessionMirroringError(
			'Failed to update session snapshot after action.',
			{
				cause,
				details: {
					sessionId,
				},
			},
		);
	}
}
