import { describe, it, expect, vi } from 'vitest';
import { SessionTransport } from '../src/transport/SessionTransport.js';
import { TransportError } from '../src/transport/TransportTypes.js';
import { createTokenAuthMiddleware } from '../src/auth/tokenAuthMiddleware.js';
import { createSyntheticSessionManager } from './helpers/createSyntheticSessionManager.js';

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
	it('returns false when the player lacks an AI controller', async () => {
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
			body: { sessionId, playerId: 'A' },
			headers: authorizedHeaders,
		});
		expect(response.ranTurn).toBe(false);
		expect(response.advance).toBeUndefined();
	});

	it('runs AI turns and reports advance results when available', async () => {
		const { manager, gainKey } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: middleware,
		});
		const created = transport.createSession({
			body: {},
			headers: authorizedHeaders,
		});
		const { sessionId } = created;
		let snapshot = created.snapshot;
		for (
			let index = 0;
			index < 6 && snapshot.game.activePlayerId !== 'B';
			index += 1
		) {
			const advance = await transport.advanceSession({
				body: { sessionId },
				headers: authorizedHeaders,
			});
			snapshot = advance.snapshot;
		}
		expect(snapshot.game.activePlayerId).toBe('B');
		const response = await transport.runAiTurn({
			body: { sessionId, playerId: 'B' },
			headers: authorizedHeaders,
		});
		expect(response.ranTurn).toBe(true);
		const players = response.snapshot.game.players;
		expect(players[1]?.resources[gainKey]).not.toBeUndefined();
	});

	it('validates AI turn requests against the protocol schema', async () => {
		const { manager } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: middleware,
		});
		await expect(
			transport.runAiTurn({
				body: { sessionId: '', playerId: 'Z' },
				headers: authorizedHeaders,
			}),
		).rejects.toBeInstanceOf(TransportError);
		try {
			await transport.runAiTurn({
				body: { sessionId: '', playerId: 'Z' },
				headers: authorizedHeaders,
			});
		} catch (error) {
			if (error instanceof TransportError) {
				expect(error.code).toBe('INVALID_REQUEST');
			}
		}
	});

	it('reports conflicts when AI execution fails', async () => {
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
		const conflict = new Error('run ai failed');
		if (session) {
			vi.spyOn(session, 'enqueue').mockImplementation(() =>
				Promise.reject(conflict),
			);
		}
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
				expect(error.code).toBe('CONFLICT');
			}
		}
	});
});
