import { describe, it, expect } from 'vitest';
import { SessionTransport } from '../src/transport/SessionTransport.js';
import { TransportError } from '../src/transport/TransportTypes.js';
import { createTokenAuthMiddleware } from '../src/auth/tokenAuthMiddleware.js';
import { createSyntheticSessionManager } from './helpers/createSyntheticSessionManager.js';

describe('SessionTransport authorization', () => {
	it('rejects requests without authentication tokens', () => {
		const { manager } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: createTokenAuthMiddleware({ tokens: {} }),
		});
		const attempt = () =>
			transport.createSession({
				body: {},
			});
		expect(attempt).toThrow(TransportError);
		try {
			attempt();
		} catch (error) {
			if (error instanceof TransportError) {
				expect(error.code).toBe('UNAUTHORIZED');
			}
		}
	});

	it('requires configured authorization middleware for protected operations', () => {
		const { manager } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
		});
		const attempt = () =>
			transport.createSession({
				body: {},
			});
		expect(attempt).toThrow(TransportError);
		try {
			attempt();
		} catch (error) {
			if (error instanceof TransportError) {
				expect(error.code).toBe('UNAUTHORIZED');
			}
		}
	});

	it('permits admin roles to satisfy authorization checks', () => {
		const { manager } = createSyntheticSessionManager();
		const adminMiddleware = createTokenAuthMiddleware({
			tokens: {
				admin: { userId: 'admin', roles: ['admin'] },
			},
		});
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: adminMiddleware,
		});
		const response = transport.createSession({
			body: {},
			headers: { authorization: 'Bearer admin' },
		});
		expect(response.sessionId).toBeDefined();
	});

	it('propagates unexpected authorization errors', () => {
		const { manager } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: () => {
				throw new Error('middleware exploded');
			},
		});
		expect(() =>
			transport.createSession({
				body: {},
				headers: { authorization: 'Bearer failing' },
			}),
		).toThrowError(/middleware exploded/);
	});
});
