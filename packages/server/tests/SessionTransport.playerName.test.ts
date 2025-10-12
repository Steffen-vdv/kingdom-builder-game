import { describe, it, expect, vi } from 'vitest';
import {
	SessionTransport,
	PLAYER_NAME_MAX_LENGTH,
} from '../src/transport/SessionTransport.js';
import { createTokenAuthMiddleware } from '../src/auth/tokenAuthMiddleware.js';
import { TransportError } from '../src/transport/TransportTypes.js';
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
	it('sanitizes and applies updated player names', () => {
		const { manager } = createSyntheticSessionManager();
		const session = manager.createSession('player-session');
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: middleware,
		});
		const updateSpy = vi.spyOn(session, 'updatePlayerName');
		const response = transport.updatePlayerName({
			body: {
				sessionId: 'player-session',
				playerId: 'A',
				playerName: '  Voyager  ',
			},
			headers: authorizedHeaders,
		});
		expect(updateSpy).toHaveBeenCalledWith('A', 'Voyager');
		const [player] = response.snapshot.game.players;
		expect(player?.name).toBe('Voyager');
	});

	it('rejects player names that exceed the maximum length', () => {
		const { manager } = createSyntheticSessionManager();
		manager.createSession('length-check');
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: middleware,
		});
		const overLengthName = 'Q'.repeat(PLAYER_NAME_MAX_LENGTH + 1);
		let thrown: unknown;
		try {
			transport.updatePlayerName({
				body: {
					sessionId: 'length-check',
					playerId: 'A',
					playerName: overLengthName,
				},
				headers: authorizedHeaders,
			});
		} catch (error) {
			thrown = error;
		}
		expect(thrown).toBeInstanceOf(TransportError);
		if (thrown instanceof TransportError) {
			expect(thrown.code).toBe('INVALID_REQUEST');
		}
	});

	it('rejects player names that trim to empty strings', () => {
		const { manager } = createSyntheticSessionManager();
		manager.createSession('empty-name');
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: middleware,
		});
		let thrown: unknown;
		try {
			transport.updatePlayerName({
				body: {
					sessionId: 'empty-name',
					playerId: 'A',
					playerName: '   ',
				},
				headers: authorizedHeaders,
			});
		} catch (error) {
			thrown = error;
		}
		expect(thrown).toBeInstanceOf(TransportError);
		if (thrown instanceof TransportError) {
			expect(thrown.code).toBe('INVALID_REQUEST');
		}
	});

	it('fails when sessions are missing', () => {
		const { manager } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: middleware,
		});
		let thrown: unknown;
		try {
			transport.updatePlayerName({
				body: {
					sessionId: 'missing-session',
					playerId: 'A',
					playerName: 'Nomad',
				},
				headers: authorizedHeaders,
			});
		} catch (error) {
			thrown = error;
		}
		expect(thrown).toBeInstanceOf(TransportError);
		if (thrown instanceof TransportError) {
			expect(thrown.code).toBe('NOT_FOUND');
		}
	});

	it('requires authorization to update player names', () => {
		const { manager } = createSyntheticSessionManager();
		manager.createSession('unauthorized');
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: middleware,
		});
		let thrown: unknown;
		try {
			transport.updatePlayerName({
				body: {
					sessionId: 'unauthorized',
					playerId: 'A',
					playerName: 'Scout',
				},
				headers: {},
			});
		} catch (error) {
			thrown = error;
		}
		expect(thrown).toBeInstanceOf(TransportError);
		if (thrown instanceof TransportError) {
			expect(thrown.code).toBe('UNAUTHORIZED');
		}
	});
});
