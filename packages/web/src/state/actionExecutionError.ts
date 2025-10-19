import type { ActionExecuteErrorResponse } from '@kingdom-builder/protocol/actions';
import type { SessionRequirementFailure } from '@kingdom-builder/protocol/session';
import {
	getActionErrorMetadata,
	setActionErrorMetadata,
} from './actionErrorMetadata';

type ActionRequirementFailures =
	ActionExecuteErrorResponse['requirementFailures'];

type ActionExecutionError = Error & {
	requirementFailure?: SessionRequirementFailure;
	requirementFailures?: ActionRequirementFailures;
	fatal?: boolean;
};

function createActionExecutionError(
	response: ActionExecuteErrorResponse,
): ActionExecutionError {
	const failure = new Error(response.error) as ActionExecutionError;
	const metadata = getActionErrorMetadata(response);
	if (response.requirementFailure) {
		failure.requirementFailure = response.requirementFailure;
	}
	if (response.requirementFailures) {
		failure.requirementFailures = response.requirementFailures;
	}
	if (response.fatal !== undefined) {
		failure.fatal = response.fatal;
	}
	if (metadata) {
		setActionErrorMetadata(failure, metadata);
		if ('cause' in metadata && metadata.cause !== undefined) {
			failure.cause = metadata.cause;
		}
	}
	return failure;
}

export type { ActionExecutionError };
export { createActionExecutionError };
