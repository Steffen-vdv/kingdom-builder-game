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

describe('SessionTransport runAiTurn', () => {
	it('runs AI turns when controllers are available', async () => {
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
		if (!session) {
			throw new Error('Session was not created.');
		}
		vi.spyOn(session, 'hasAiController').mockReturnValue(true);
		const runSpy = vi.spyOn(session, 'runAiTurn').mockResolvedValue(true);
		vi.spyOn(session, 'enqueue').mockImplementation(async (factory) => {
			return await factory();
		});
		const result = await transport.runAiTurn({
			body: { sessionId, playerId: 'A' },
			headers: authorizedHeaders,
		});
		expect(result.sessionId).toBe(sessionId);
		expect(result.ranTurn).toBe(true);
		expect(result.snapshot.game).toBeDefined();
		expect(result.registries.actions).toBeDefined();
		expect(runSpy).toHaveBeenCalledWith('A');
	});

	it('rejects AI requests when controllers are missing', async () => {
		const { manager } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: middleware,
		});
		const { sessionId } = transport.createSession({
			body: {},
			headers: authorizedHeaders,
		});
		await expect(
			transport.runAiTurn({
				body: { sessionId, playerId: 'A' },
				headers: authorizedHeaders,
			}),
		).rejects.toThrowError(TransportError);
	});

	it('validates AI request payloads', async () => {
		const { manager } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: middleware,
		});
		await expect(
			transport.runAiTurn({
				body: {},
				headers: authorizedHeaders,
			}),
		).rejects.toThrowError(TransportError);
	});
});
