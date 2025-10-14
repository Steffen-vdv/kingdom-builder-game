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
	it('returns sanitized action costs', () => {
		const { manager, actionId } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: middleware,
		});
		const { sessionId } = transport.createSession({
			body: {},
			headers: authorizedHeaders,
		});
		const session = manager.getSession(sessionId);
		expect(session).toBeDefined();
		const expectedCosts: Record<string, number> = {};
		const rawCosts = session?.getActionCosts(actionId) ?? {};
		for (const [resourceKey, amount] of Object.entries(rawCosts)) {
			if (typeof amount === 'number') {
				expectedCosts[resourceKey] = amount;
			}
		}
		const result = transport.getActionCosts({
			body: { sessionId, actionId },
			headers: authorizedHeaders,
		});
		expect(result.sessionId).toBe(sessionId);
		expect(result.costs).toEqual(expectedCosts);
	});

	it('returns requirements for actions', () => {
		const { manager, actionId } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: middleware,
		});
		const { sessionId } = transport.createSession({
			body: {},
			headers: authorizedHeaders,
		});
		const requirements = transport.getActionRequirements({
			body: { sessionId, actionId },
			headers: authorizedHeaders,
		});
		expect(requirements.sessionId).toBe(sessionId);
		expect(Array.isArray(requirements.requirements)).toBe(true);
	});

	it('returns effect groups for actions', () => {
		const { manager, actionId } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: middleware,
		});
		const { sessionId } = transport.createSession({
			body: {},
			headers: authorizedHeaders,
		});
		const options = transport.getActionOptions({
			body: { sessionId, actionId },
			headers: authorizedHeaders,
		});
		expect(options.sessionId).toBe(sessionId);
		expect(Array.isArray(options.groups)).toBe(true);
	});

	it('validates metadata request payloads', () => {
		const { manager } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: middleware,
		});
		transport.createSession({
			body: {},
			headers: authorizedHeaders,
		});
		expect(() =>
			transport.getActionCosts({
				body: {},
				headers: authorizedHeaders,
			}),
		).toThrowError(TransportError);
		expect(() =>
			transport.getActionRequirements({
				body: {},
				headers: authorizedHeaders,
			}),
		).toThrowError(TransportError);
		expect(() =>
			transport.getActionOptions({
				body: {},
				headers: authorizedHeaders,
			}),
		).toThrowError(TransportError);
	});

	it('reports unknown actions for metadata lookups', () => {
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
				body: { sessionId, actionId: 'missing' },
				headers: authorizedHeaders,
			}),
		).toThrowError(/was not found/);
		expect(() =>
			transport.getActionRequirements({
				body: { sessionId, actionId: 'missing' },
				headers: authorizedHeaders,
			}),
		).toThrowError(/was not found/);
		expect(() =>
			transport.getActionOptions({
				body: { sessionId, actionId: 'missing' },
				headers: authorizedHeaders,
			}),
		).toThrowError(/was not found/);
	});
});
