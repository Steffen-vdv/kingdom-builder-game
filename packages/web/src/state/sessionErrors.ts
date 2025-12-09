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
 * Checks if an error indicates the session has expired (server returned 404
 * with NOT_FOUND code). This happens when the user is idle for too long and
 * the server purges the session.
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
	const { code } = body as { code?: unknown };
	return code === 'NOT_FOUND';
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
