import { describe, it, expect, vi } from 'vitest';
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

describe('SessionTransport simulateUpcomingPhases', () => {
	it('returns simulation results from the engine session', () => {
		const { manager } = createSyntheticSessionManager();
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
		const expected = { forecast: [{ phaseId: 'main', steps: [] }] };
		const simulateSpy = session
			? vi.spyOn(session, 'simulateUpcomingPhases').mockReturnValue(expected)
			: null;
		const result = transport.simulateUpcomingPhases({
			body: { sessionId, playerId: 'A', options: { maxIterations: 2 } },
			headers: authorizedHeaders,
		});
		expect(result.sessionId).toBe(sessionId);
		expect(result.result).toEqual(expected);
		if (simulateSpy) {
			expect(simulateSpy).toHaveBeenCalledWith('A', { maxIterations: 2 });
		}
	});

	it('validates simulation payloads', () => {
		const { manager } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: middleware,
		});
		expect(() =>
			transport.simulateUpcomingPhases({
				body: {},
				headers: authorizedHeaders,
			}),
		).toThrowError(TransportError);
	});
});
