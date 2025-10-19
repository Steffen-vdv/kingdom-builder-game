import type { ActionExecuteRequest } from '@kingdom-builder/protocol/actions';

export interface ActionErrorMetadata {
	request: ActionExecuteRequest;
	cause?: unknown;
	context?: Record<string, unknown>;
	gameApi?: {
		status: number;
		statusText: string;
		body: unknown;
	};
}

const ACTION_ERROR_METADATA_KEY = Symbol('session:action-error-metadata');

export const setActionErrorMetadata = (
	target: object,
	metadata: ActionErrorMetadata,
): void => {
	Reflect.set(
		target as Record<PropertyKey, unknown>,
		ACTION_ERROR_METADATA_KEY,
		metadata,
	);
};

export const getActionErrorMetadata = (
	target: unknown,
): ActionErrorMetadata | undefined => {
	if (!target || typeof target !== 'object') {
		return undefined;
	}
	return Reflect.get(
		target as Record<PropertyKey, unknown>,
		ACTION_ERROR_METADATA_KEY,
	) as ActionErrorMetadata | undefined;
};
