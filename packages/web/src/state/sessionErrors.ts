const fatalSessionErrorFlag = Symbol('session:fatal-error');

export class SessionMirroringError extends Error {
	public override readonly cause: unknown;

	public readonly details: Record<string, unknown>;

	public constructor(
		message: string,
		{
			cause,
			details = {},
		}: { cause: unknown; details?: Record<string, unknown> },
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
