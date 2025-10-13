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

describe('SessionTransport runAiTurn', () => {
	it('runs AI controllers and returns updated snapshots', async () => {
		const { manager } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: middleware,
		});
		const { sessionId } = transport.createSession({
			body: {},
			headers: authorizedHeaders,
		});
		const response = await transport.runAiTurn({
			body: { sessionId, playerId: 'B' },
			headers: authorizedHeaders,
		});
		expect(response.sessionId).toBe(sessionId);
		expect(typeof response.ranTurn).toBe('boolean');
		expect(response.snapshot.game.currentPlayerIndex).toBe(0);
		expect(response.registries.actions).toBeDefined();
	});

	it('throws NOT_FOUND when no AI controller is registered', async () => {
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
		).rejects.toBeInstanceOf(TransportError);
		try {
			await transport.runAiTurn({
				body: { sessionId, playerId: 'A' },
				headers: authorizedHeaders,
			});
		} catch (error) {
			if (error instanceof TransportError) {
				expect(error.code).toBe('NOT_FOUND');
			}
		}
	});

	it('validates incoming AI requests', async () => {
		const { manager } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: middleware,
		});
		await expect(
			transport.runAiTurn({
				body: { sessionId: '', playerId: 'B' },
				headers: authorizedHeaders,
			}),
		).rejects.toBeInstanceOf(TransportError);
		try {
			await transport.runAiTurn({
				body: { sessionId: '', playerId: 'B' },
				headers: authorizedHeaders,
			});
		} catch (error) {
			if (error instanceof TransportError) {
				expect(error.code).toBe('INVALID_REQUEST');
			}
		}
	});
});
