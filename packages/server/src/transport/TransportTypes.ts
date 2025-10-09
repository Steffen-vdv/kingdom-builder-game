import type { AuthenticatedRequest } from '../auth/tokenAuthMiddleware.js';

type HttpStatusCarrier = { httpStatus?: number };

export type TransportIdFactory = () => string;

export type TransportHttpResponse<T> = T & HttpStatusCarrier;

export type TransportErrorCode =
	| 'INVALID_REQUEST'
	| 'NOT_FOUND'
	| 'CONFLICT'
	| 'UNAUTHORIZED'
	| 'FORBIDDEN';

export class TransportError extends Error {
	public readonly code: TransportErrorCode;

	public readonly issues?: unknown;

	public constructor(
		code: TransportErrorCode,
		message: string,
		options: { cause?: unknown; issues?: unknown } = {},
	) {
		super(message);
		this.code = code;
		this.issues = options.issues;
		if (options.cause) {
			this.cause = options.cause;
		}
	}
}

export interface TransportRequest<T = unknown> extends AuthenticatedRequest<T> {
	body: T;
}
