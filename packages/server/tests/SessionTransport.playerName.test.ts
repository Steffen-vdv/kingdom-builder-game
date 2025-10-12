import { describe, it, expect } from 'vitest';
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
		viewer: {
			userId: 'viewer',
			roles: ['session:create'],
		},
	},
});

const authorizedHeaders = {
	authorization: 'Bearer session-manager',
} satisfies Record<string, string>;

const viewerHeaders = {
	authorization: 'Bearer viewer',
} satisfies Record<string, string>;

describe('LHF - T4 - SessionTransport player name updates', () => {
	it('applies sanitized player names to running sessions', () => {
		const { manager } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: middleware,
		});
		const { sessionId } = transport.createSession({
			body: {},
			headers: authorizedHeaders,
		});
		const response = transport.updatePlayerName({
			body: {
				sessionId,
				playerId: 'A',
				playerName: '  Voyager  ',
			},
			headers: authorizedHeaders,
		});
		const [playerA] = response.snapshot.game.players;
		expect(playerA?.name).toBe('Voyager');
	});

	it('rejects invalid player name updates', () => {
		const { manager } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: middleware,
		});
		const { sessionId } = transport.createSession({
			body: {},
			headers: authorizedHeaders,
		});
		let thrown: unknown;
		try {
			transport.updatePlayerName({
				body: {
					sessionId,
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

	it('requires advance privileges to rename players', () => {
		const { manager } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: middleware,
		});
		const session = transport.createSession({
			body: {},
			headers: authorizedHeaders,
		});
		let thrown: unknown;
		try {
			transport.updatePlayerName({
				body: {
					sessionId: session.sessionId,
					playerId: 'A',
					playerName: 'Scout',
				},
				headers: viewerHeaders,
			});
		} catch (error) {
			thrown = error;
		}
		expect(thrown).toBeInstanceOf(TransportError);
		if (thrown instanceof TransportError) {
			expect(thrown.code).toBe('FORBIDDEN');
		}
	});
});
