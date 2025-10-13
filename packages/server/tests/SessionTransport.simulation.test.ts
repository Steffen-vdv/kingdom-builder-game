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

describe('SessionTransport simulateUpcomingPhases', () => {
	it('simulates upcoming phases for the active player', () => {
		const { manager } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: middleware,
		});
		const { sessionId } = transport.createSession({
			body: {},
			headers: authorizedHeaders,
		});
		const response = transport.simulateUpcomingPhases({
			body: {
				sessionId,
				playerId: 'A',
				options: {
					phaseIds: { growth: 'main', upkeep: 'end' },
				},
			},
			headers: authorizedHeaders,
		});
		expect(response.sessionId).toBe(sessionId);
		expect(response.result.playerId).toBe('A');
		expect(response.result.steps.length).toBeGreaterThan(0);
	});

	it('wraps engine errors as conflicts', () => {
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
			transport.simulateUpcomingPhases({
				body: {
					sessionId,
					playerId: 'A',
					options: {
						phaseIds: {
							growth: 'main',
							upkeep: 'end',
						},
						maxIterations: 0,
					},
				},
				headers: authorizedHeaders,
			}),
		).toThrowError(TransportError);
		try {
			transport.simulateUpcomingPhases({
				body: {
					sessionId,
					playerId: 'A',
					options: {
						phaseIds: {
							growth: 'main',
							upkeep: 'end',
						},
						maxIterations: 0,
					},
				},
				headers: authorizedHeaders,
			});
		} catch (error) {
			if (error instanceof TransportError) {
				expect(error.code).toBe('CONFLICT');
			}
		}
	});

	it('validates incoming simulation payloads', () => {
		const { manager } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: middleware,
		});
		expect(() =>
			transport.simulateUpcomingPhases({
				body: { sessionId: '', playerId: 'A' },
				headers: authorizedHeaders,
			}),
		).toThrowError(TransportError);
		try {
			transport.simulateUpcomingPhases({
				body: { sessionId: '', playerId: 'A' },
				headers: authorizedHeaders,
			});
		} catch (error) {
			if (error instanceof TransportError) {
				expect(error.code).toBe('INVALID_REQUEST');
			}
		}
	});
});
