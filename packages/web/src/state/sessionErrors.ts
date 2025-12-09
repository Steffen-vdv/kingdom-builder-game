import { GameApiError } from '../services/gameApi';

const fatalSessionErrorFlag = Symbol('session:fatal-error');
const sessionExpiredFlag = Symbol('session:expired');

export interface SessionMirroringErrorOptions {
	cause: unknown;
	details?: Record<string, unknown>;
}

export class SessionMirroringError extends Error {
	public override readonly cause: unknown;

	public readonly details: Record<string, unknown>;

	public constructor(
		message: string,
		{ cause, details = {} }: SessionMirroringErrorOptions,
	) {
		super(message);
		this.name = 'SessionMirroringError';
		this.cause = cause;
		this.details = details;
	}
}

export function markFatalSessionError(error: unknown): void {
	if (error === null || typeof error !== 'object') {
		return;
	}
	Reflect.set(
		error as Record<PropertyKey, unknown>,
		fatalSessionErrorFlag,
		true,
	);
}

export function isFatalSessionError(error: unknown): boolean {
	if (error === null || typeof error !== 'object') {
		return false;
	}
	return Boolean(
		Reflect.get(error as Record<PropertyKey, unknown>, fatalSessionErrorFlag),
	);
}

/**
 * Pattern matching the server's session-not-found message format:
 * `Session "${sessionId}" was not found.`
 *
 * This is distinct from other NOT_FOUND errors like action-not-found which
 * use different message formats (e.g., `Action "x" was not found in session`).
 */
const SESSION_NOT_FOUND_PATTERN = /^Session "[^"]+" was not found\.$/;

/**
 * Checks if an error indicates the session has expired (server returned 404
 * with NOT_FOUND code and session-specific message). This happens when the
 * user is idle for too long and the server purges the session.
 */
export function isSessionExpiredError(error: unknown): boolean {
	if (!(error instanceof GameApiError)) {
		return false;
	}
	if (error.status !== 404) {
		return false;
	}
	const body = error.body;
	if (body === null || typeof body !== 'object') {
		return false;
	}
	const record = body as { code?: unknown; message?: unknown };
	if (record.code !== 'NOT_FOUND') {
		return false;
	}
	if (typeof record.message !== 'string') {
		return false;
	}
	return SESSION_NOT_FOUND_PATTERN.test(record.message);
}

export function markSessionExpired(error: unknown): void {
	if (error === null || typeof error !== 'object') {
		return;
	}
	Reflect.set(error as Record<PropertyKey, unknown>, sessionExpiredFlag, true);
}

export function isMarkedSessionExpired(error: unknown): boolean {
	if (error === null || typeof error !== 'object') {
		return false;
	}
	return Boolean(
		Reflect.get(error as Record<PropertyKey, unknown>, sessionExpiredFlag),
	);
}
