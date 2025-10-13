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
	it('returns simulation results from the engine session', async () => {
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
		let playerId: string | null = null;
		if (session) {
			const snapshot = session.getSnapshot();
			playerId = snapshot.game.players[0]?.id ?? null;
		}
		expect(playerId).not.toBeNull();
		if (!session || playerId === null) {
			throw new Error('Session snapshot was unavailable.');
		}
		const simulateSpy = vi
			.spyOn(session, 'simulateUpcomingPhases')
			.mockReturnValue(expected);
		vi.spyOn(session, 'enqueue').mockImplementation(async (factory) => {
			return await factory();
		});
		const result = await transport.simulateUpcomingPhases({
			body: {
				sessionId,
				playerId,
				options: { maxIterations: 2 },
			},
			headers: authorizedHeaders,
		});
		expect(result.sessionId).toBe(sessionId);
		expect(result.result).toEqual(expected);
		expect(simulateSpy).toHaveBeenCalledWith(playerId, {
			maxIterations: 2,
		});
	});

	it('validates simulation payloads', async () => {
		const { manager } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: middleware,
		});
		await expect(
			transport.simulateUpcomingPhases({
				body: {},
				headers: authorizedHeaders,
			}),
		).rejects.toThrowError(TransportError);
	});
});
