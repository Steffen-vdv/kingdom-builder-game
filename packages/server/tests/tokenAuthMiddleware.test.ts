import { describe, it, expect } from 'vitest';
import { createTokenAuthMiddleware } from '../src/auth/tokenAuthMiddleware.js';
import { AuthError } from '../src/auth/AuthError.js';

describe('tokenAuthMiddleware', () => {
	it('authenticates bearer tokens from the authorization header', () => {
		const middleware = createTokenAuthMiddleware({
			tokens: {
				'bearer-token': {
					userId: 'user-bearer',
					roles: ['session:create'],
				},
			},
		});
		const request = {
			headers: { Authorization: 'Bearer bearer-token' },
		};
		const context = middleware(request);
		expect(context.userId).toBe('user-bearer');
		expect(context.roles).toContain('session:create');
		expect(request.auth).toBe(context);
	});

	it('reads tokens from the alternate header when provided', () => {
		const middleware = createTokenAuthMiddleware({
			tokens: {
				'dev-token': { userId: 'developer', roles: [] },
			},
		});
		const request = {
			headers: { 'X-KB-Dev-Token': ' dev-token ' },
		};
		const context = middleware(request);
		expect(context.userId).toBe('developer');
		expect(context.token).toBe('dev-token');
	});

	it('skips token definitions that omit user identifiers', () => {
		const middleware = createTokenAuthMiddleware({
			tokens: {
				valid: { userId: 'valid-user', roles: [] },
				invalid: { userId: '' },
			},
		});
		expect(() =>
			middleware({
				headers: { authorization: 'invalid' },
			}),
		).toThrowError(AuthError);
	});

	it('throws when environment token configuration is invalid JSON', () => {
		const env = { KB_SERVER_AUTH_TOKENS: '{not-json' } as NodeJS.ProcessEnv;
		expect(() => createTokenAuthMiddleware({ env })).toThrowError(
			new AuthError('FORBIDDEN', 'Invalid token configuration.'),
		);
	});

	it('reuses cached authorization contexts on incoming requests', () => {
		const middleware = createTokenAuthMiddleware({
			tokens: {
				cached: { userId: 'cached-user', roles: [] },
			},
		});
		const existing = {
			userId: 'cached-user',
			roles: ['session:create'],
			token: 'cached',
		};
		const request = { auth: existing };
		const context = middleware(request);
		expect(context).toBe(existing);
	});
});
