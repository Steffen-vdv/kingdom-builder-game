import { sessionIdSchema } from '@kingdom-builder/protocol';
import { TransportError } from './TransportTypes.js';
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

export function parseSessionIdentifier(body: unknown): string {
	const parsed = sessionIdSchema.safeParse(
		(body as { sessionId?: unknown })?.sessionId,
	);
	if (!parsed.success) {
		throw new TransportError('INVALID_REQUEST', 'Invalid session identifier.', {
			issues: parsed.error.issues,
		});
	}
	return parsed.data;
}
