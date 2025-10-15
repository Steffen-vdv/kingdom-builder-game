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
