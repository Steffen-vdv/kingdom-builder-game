import type { SessionRequirementFailure } from '@kingdom-builder/protocol';
import type { TransportHttpResponse } from './TransportTypes.js';

export function attachHttpStatus<T extends object>(
	payload: T,
	status: number,
): TransportHttpResponse<T> {
	Object.defineProperty(payload, 'httpStatus', {
		value: status,
		enumerable: false,
	});
	return payload as TransportHttpResponse<T>;
}

export function extractRequirementFailure(
	error: unknown,
): SessionRequirementFailure | undefined {
	if (!error || typeof error !== 'object') {
		return undefined;
	}
	const failure = (error as { requirementFailure?: SessionRequirementFailure })
		.requirementFailure;
	if (!failure) {
		return undefined;
	}
	return structuredClone(failure);
}
