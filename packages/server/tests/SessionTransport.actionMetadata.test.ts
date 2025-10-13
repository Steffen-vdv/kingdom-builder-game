import { describe, it, expect } from 'vitest';
import { SessionTransport } from '../src/transport/SessionTransport.js';
import { createTokenAuthMiddleware } from '../src/auth/tokenAuthMiddleware.js';
import { createSyntheticSessionManager } from './helpers/createSyntheticSessionManager.js';
import { TransportError } from '../src/transport/TransportTypes.js';

const middleware = createTokenAuthMiddleware({
	tokens: {
		'session-manager': {
			userId: 'session-manager',
			roles: ['session:create', 'session:advance', 'admin'],
		},
	},
});

const authorizedHeaders = {
	authorization: 'Bearer session-manager',
} satisfies Record<string, string>;

describe('SessionTransport action metadata', () => {
	it('returns action costs for known actions', () => {
		const { manager, actionId, costKey } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: middleware,
		});
		const { sessionId } = transport.createSession({
			body: {},
			headers: authorizedHeaders,
		});
		const response = transport.getActionCosts({
			body: { sessionId, actionId },
			headers: authorizedHeaders,
		});
		expect(response.sessionId).toBe(sessionId);
		expect(response.costs[costKey]).toBe(1);
	});

	it('returns action requirements for known actions', () => {
		const { manager, actionId } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: middleware,
		});
		const { sessionId } = transport.createSession({
			body: {},
			headers: authorizedHeaders,
		});
		const response = transport.getActionRequirements({
			body: { sessionId, actionId },
			headers: authorizedHeaders,
		});
		expect(response.sessionId).toBe(sessionId);
		expect(Array.isArray(response.requirements)).toBe(true);
	});

	it('returns action options for known actions', () => {
		const { manager, actionId } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: middleware,
		});
		const { sessionId } = transport.createSession({
			body: {},
			headers: authorizedHeaders,
		});
		const response = transport.getActionOptions({
			body: { sessionId, actionId },
			headers: authorizedHeaders,
		});
		expect(response.sessionId).toBe(sessionId);
		expect(Array.isArray(response.groups)).toBe(true);
	});

	it('throws NOT_FOUND when requesting metadata for unknown actions', () => {
		const { manager } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: middleware,
		});
		const { sessionId } = transport.createSession({
			body: {},
			headers: authorizedHeaders,
		});
		expect(() =>
			transport.getActionCosts({
				body: { sessionId, actionId: 'missing-action' },
				headers: authorizedHeaders,
			}),
		).toThrowError(TransportError);
		try {
			transport.getActionCosts({
				body: { sessionId, actionId: 'missing-action' },
				headers: authorizedHeaders,
			});
		} catch (error) {
			if (error instanceof TransportError) {
				expect(error.code).toBe('NOT_FOUND');
			}
		}
	});

	it('validates incoming metadata requests', () => {
		const { manager } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: middleware,
		});
		const { sessionId } = transport.createSession({
			body: {},
			headers: authorizedHeaders,
		});
		expect(() =>
			transport.getActionRequirements({
				body: { sessionId, actionId: '' },
				headers: authorizedHeaders,
			}),
		).toThrowError(TransportError);
		try {
			transport.getActionOptions({
				body: { sessionId, actionId: '' },
				headers: authorizedHeaders,
			});
		} catch (error) {
			if (error instanceof TransportError) {
				expect(error.code).toBe('INVALID_REQUEST');
			}
		}
	});
});
