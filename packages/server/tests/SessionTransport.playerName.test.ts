import { describe, expect, it, vi } from 'vitest';
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

describe('SessionTransport updatePlayerName', () => {
	it('updates player names for active sessions', () => {
		const { manager } = createSyntheticSessionManager();
		const session = manager.createSession('rename-session');
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: middleware,
		});
		const response = transport.updatePlayerName({
			body: {
				sessionId: 'rename-session',
				playerId: 'A',
				name: 'Echo',
			},
			headers: authorizedHeaders,
		});
		const [playerA] = response.snapshot.game.players;
		expect(playerA?.name).toBe('Echo');
		const snapshot = session.getSnapshot();
		expect(snapshot.game.players[0]?.name).toBe('Echo');
	});

	it('trims whitespace before applying player names', () => {
		const { manager } = createSyntheticSessionManager();
		const session = manager.createSession('trim-session');
		const updateSpy = vi.spyOn(session, 'updatePlayerName');
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: middleware,
		});
		const response = transport.updatePlayerName({
			body: {
				sessionId: 'trim-session',
				playerId: 'B',
				name: '  Foxtrot  ',
			},
			headers: authorizedHeaders,
		});
		expect(updateSpy).toHaveBeenCalledWith('B', 'Foxtrot');
		const [, playerB] = response.snapshot.game.players;
		expect(playerB?.name).toBe('Foxtrot');
	});

	it('rejects blank player name updates', () => {
		const { manager } = createSyntheticSessionManager();
		manager.createSession('invalid-session');
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: middleware,
		});
		expect(() =>
			transport.updatePlayerName({
				body: {
					sessionId: 'invalid-session',
					playerId: 'A',
					name: '   ',
				},
				headers: authorizedHeaders,
			}),
		).toThrow(TransportError);
		try {
			transport.updatePlayerName({
				body: {
					sessionId: 'invalid-session',
					playerId: 'A',
					name: '   ',
				},
				headers: authorizedHeaders,
			});
		} catch (error) {
			if (error instanceof TransportError) {
				expect(error.code).toBe('INVALID_REQUEST');
			}
		}
	});
});
