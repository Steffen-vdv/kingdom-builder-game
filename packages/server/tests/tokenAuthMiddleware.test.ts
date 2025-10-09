import { describe, expect, it } from 'vitest';
import { createTokenAuthMiddleware } from '../src/auth/tokenAuthMiddleware.js';
import { AuthError } from '../src/auth/AuthError.js';

const AUTH_HEADER = 'authorization';

describe('tokenAuthMiddleware', () => {
	it('authenticates bearer tokens and caches the context on the request', () => {
		const middleware = createTokenAuthMiddleware({
			tokens: {
				alpha: {
					userId: 'alpha-user',
					roles: ['session:create'],
				},
			},
		});
		const request = {
			headers: { Authorization: 'Bearer alpha ' },
		};
		const firstContext = middleware(request);
		expect(firstContext).toEqual({
			userId: 'alpha-user',
			roles: ['session:create'],
			token: 'alpha',
		});
		const cached = middleware(request);
		expect(cached).toBe(firstContext);
	});

	it('reads tokens from the alternate developer header', () => {
		const middleware = createTokenAuthMiddleware({
			tokens: {
				dev: { userId: 'developer' },
			},
		});
		const context = middleware({
			headers: { 'X-KB-Dev-Token': 'dev' },
		});
		expect(context.userId).toBe('developer');
		expect(context.roles).toEqual([]);
		expect(context.token).toBe('dev');
	});

	it('allows tokens configured through environment variables', () => {
		const env = {
			KB_SERVER_AUTH_TOKENS: JSON.stringify({
				env: {
					userId: 'env-user',
					roles: ['admin'],
				},
			}),
		};
		const middleware = createTokenAuthMiddleware({ env });
		const context = middleware({
			headers: { [AUTH_HEADER]: 'env' },
		});
		expect(context.userId).toBe('env-user');
		expect(context.roles).toEqual(['admin']);
		const second = middleware({
			headers: { [AUTH_HEADER]: 'env' },
		});
		expect(second).not.toBe(context);
		expect(second.roles).toEqual(['admin']);
	});

	it('ignores token definitions that do not specify a user id', () => {
		const middleware = createTokenAuthMiddleware({
			tokens: {
				empty: { userId: '' },
				valid: { userId: 'user' },
			},
		});
		expect(() => middleware({ headers: { [AUTH_HEADER]: 'empty' } })).toThrow(
			AuthError,
		);
		const context = middleware({
			headers: { [AUTH_HEADER]: 'valid' },
		});
		expect(context.userId).toBe('user');
		expect(context.roles).toEqual([]);
	});

	it('throws specific errors for missing or unknown tokens', () => {
		const middleware = createTokenAuthMiddleware({
			tokens: {
				beta: { userId: 'beta-user' },
			},
		});
		expect(() => middleware({})).toThrowError(/Missing authentication token/);
		try {
			middleware({});
		} catch (error) {
			if (error instanceof AuthError) {
				expect(error.code).toBe('UNAUTHORIZED');
			}
		}
		expect(() =>
			middleware({ headers: { [AUTH_HEADER]: 'gamma' } }),
		).toThrowError(/not authorized/);
		try {
			middleware({ headers: { [AUTH_HEADER]: 'gamma' } });
		} catch (error) {
			if (error instanceof AuthError) {
				expect(error.code).toBe('FORBIDDEN');
			}
		}
	});

	it('rejects invalid environment token configurations', () => {
		expect(() =>
			createTokenAuthMiddleware({
				env: { KB_SERVER_AUTH_TOKENS: '{ not json' },
			}),
		).toThrow(AuthError);
	});
});
