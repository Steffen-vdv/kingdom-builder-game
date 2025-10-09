import { describe, it, expect, vi } from 'vitest';
import { createTokenAuthMiddleware } from '../src/auth/tokenAuthMiddleware.js';
import { AuthError } from '../src/auth/AuthError.js';

describe('tokenAuthMiddleware', () => {
	it('returns pre-authenticated requests without parsing headers', () => {
		const middleware = createTokenAuthMiddleware({
			tokens: { demo: { userId: 'demo', roles: ['role'] } },
		});
		const request = { auth: { userId: 'demo', roles: ['role'] } };
		const context = middleware(request);
		expect(context.userId).toBe('demo');
		expect(request.auth).toBe(context);
	});

	it('reads bearer tokens from the authorization header', () => {
		const middleware = createTokenAuthMiddleware({
			tokens: { demo: { userId: 'user', roles: ['alpha'] } },
		});
		const context = middleware({
			headers: { Authorization: 'Bearer demo' },
		});
		expect(context.userId).toBe('user');
		expect(context.roles).toEqual(['alpha']);
	});

	it('accepts plain tokens from the alternate header', () => {
		const middleware = createTokenAuthMiddleware({
			tokens: { beta: { userId: 'beta', roles: ['beta-role'] } },
		});
		const context = middleware({
			headers: { 'X-KB-DEV-TOKEN': 'beta' },
		});
		expect(context.userId).toBe('beta');
	});

	it('loads token definitions from environment variables', () => {
		vi.stubEnv(
			'KB_SERVER_AUTH_TOKENS',
			JSON.stringify({ env: { userId: 'env-user', roles: ['env-role'] } }),
		);
		const middleware = createTokenAuthMiddleware();
		const context = middleware({
			headers: { Authorization: 'Bearer env' },
		});
		expect(context.userId).toBe('env-user');
		expect(context.roles).toEqual(['env-role']);
	});

	it('throws unauthorized errors when tokens are missing', () => {
		const middleware = createTokenAuthMiddleware({ tokens: {} });
		expect(() => middleware({ headers: {} })).toThrow(AuthError);
		try {
			middleware({ headers: {} });
		} catch (error) {
			expect(error).toBeInstanceOf(AuthError);
			if (error instanceof AuthError) {
				expect(error.code).toBe('UNAUTHORIZED');
			}
		}
	});

	it('throws forbidden errors for unknown tokens', () => {
		const middleware = createTokenAuthMiddleware({ tokens: {} });
		expect(() =>
			middleware({ headers: { authorization: 'Bearer unknown' } }),
		).toThrow(AuthError);
	});

	it('reports invalid environment configuration', () => {
		vi.stubEnv('KB_SERVER_AUTH_TOKENS', 'not-json');
		expect(() => createTokenAuthMiddleware()).toThrow(AuthError);
		try {
			createTokenAuthMiddleware();
		} catch (error) {
			expect(error).toBeInstanceOf(AuthError);
			if (error instanceof AuthError) {
				expect(error.code).toBe('FORBIDDEN');
			}
		}
	});
});
