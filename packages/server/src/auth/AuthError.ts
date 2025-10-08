export type AuthErrorCode = 'UNAUTHORIZED' | 'FORBIDDEN';

export class AuthError extends Error {
	public readonly code: AuthErrorCode;

	public constructor(code: AuthErrorCode, message: string) {
		super(message);
		this.code = code;
	}
}
