import type {
	ActionExecuteErrorResponse,
	ActionExecuteRequest,
	ActionExecuteResponse,
	ActionExecuteSuccessResponse,
} from '@kingdom-builder/protocol/actions';
import { ensureGameApi } from './gameApiInstance';
import { enqueueSessionTask, updateSessionSnapshot } from './sessionStateStore';
import { SessionMirroringError, markFatalSessionError } from './sessionErrors';
import type { GameApiRequestOptions } from '../services/gameApi';

type ActionExecutionFailure = Error & {
	requirementFailure?: ActionExecuteErrorResponse['requirementFailure'];
	requirementFailures?: ActionExecuteErrorResponse['requirementFailures'];
};

export type SessionQueueOptions = { skipQueue?: boolean };

function normalizeActionError(error: unknown): ActionExecuteErrorResponse {
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

function applyActionSnapshot(
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

export async function performSessionAction(
	request: ActionExecuteRequest,
	requestOptions: GameApiRequestOptions = {},
	options: SessionQueueOptions = {},
): Promise<ActionExecuteResponse> {
	const api = ensureGameApi();
	const execute = async () => {
		const response = await api.performAction(request, requestOptions);
		if (response.status === 'success') {
			applyActionSnapshot(request.sessionId, response);
		}
		return response;
	};
	try {
		return await (options.skipQueue
			? execute()
			: enqueueSessionTask(request.sessionId, execute));
	} catch (error) {
		if (error instanceof SessionMirroringError) {
			markFatalSessionError(error);
			throw error;
		}
		return normalizeActionError(error);
	}
}
