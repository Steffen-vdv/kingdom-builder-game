import { describe, it, expect, vi } from 'vitest';
import {
	SessionTransport,
	TransportError,
} from '../src/transport/SessionTransport.js';
import type { RequestContext } from '../src/auth/index.js';
import { createSyntheticSessionManager } from './helpers/createSyntheticSessionManager.js';

describe('SessionTransport', () => {
	const fullAuthContext: RequestContext = {
		auth: {
			userId: 'tester',
			roles: ['session:create', 'session:advance', 'session:devmode'],
			token: 'dev-token',
		},
	};

	it('creates sessions and applies player preferences', () => {
		const { manager } = createSyntheticSessionManager();
		const idFactory = vi.fn().mockReturnValue('transport-session');
		const transport = new SessionTransport({
			sessionManager: manager,
			idFactory,
		});
		const response = transport.createSession(
			{
				devMode: true,
				playerNames: { A: 'Alpha', B: 'Beta' },
			},
			fullAuthContext,
		);
		expect(response.sessionId).toBe('transport-session');
		expect(response.snapshot.game.devMode).toBe(true);
		const [playerA, playerB] = response.snapshot.game.players;
		expect(playerA?.name).toBe('Alpha');
		expect(playerB?.name).toBe('Beta');
	});

	it('returns session state snapshots', () => {
		const { manager } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			idFactory: vi.fn().mockReturnValue('state-session'),
		});
		const { sessionId } = transport.createSession({}, fullAuthContext);
		const state = transport.getSessionState({ sessionId });
		expect(state.sessionId).toBe(sessionId);
		expect(state.snapshot.game.players).toHaveLength(2);
	});

	it('advances sessions and reports results', () => {
		const { manager } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			idFactory: vi.fn().mockReturnValue('advance-session'),
		});
		const { sessionId } = transport.createSession({}, fullAuthContext);
		const advance = transport.advanceSession({ sessionId }, fullAuthContext);
		expect(advance.sessionId).toBe(sessionId);
		expect(advance.snapshot.game.currentPhase).toBe('end');
		expect(Array.isArray(advance.advance.effects)).toBe(true);
	});

	it('toggles developer mode on demand', () => {
		const { manager } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			idFactory: vi.fn().mockReturnValue('dev-session'),
		});
		const { sessionId } = transport.createSession(
			{
				devMode: false,
			},
			fullAuthContext,
		);
		const updated = transport.setDevMode(
			{
				sessionId,
				enabled: true,
			},
			fullAuthContext,
		);
		expect(updated.snapshot.game.devMode).toBe(true);
	});

	it('throws when a session cannot be located', () => {
		const { manager } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			idFactory: vi.fn().mockReturnValue('missing-session'),
		});
		const expectNotFound = () =>
			transport.getSessionState({ sessionId: 'missing' });
		expect(expectNotFound).toThrow(TransportError);
		try {
			expectNotFound();
		} catch (error) {
			if (error instanceof TransportError) {
				expect(error.code).toBe('NOT_FOUND');
			}
		}
	});

	it('validates incoming requests', () => {
		const { manager } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			idFactory: vi.fn().mockReturnValue('validation-session'),
		});
		expect(() =>
			transport.advanceSession({ sessionId: '' }, fullAuthContext),
		).toThrow(TransportError);
		try {
			transport.advanceSession({ sessionId: '' }, fullAuthContext);
		} catch (error) {
			if (error instanceof TransportError) {
				expect(error.code).toBe('INVALID_REQUEST');
			}
		}
	});

	it('rejects session creation when authentication is missing', () => {
		const { manager } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			idFactory: vi.fn().mockReturnValue('unauthorized-session'),
		});
		expect(() => transport.createSession({})).toThrow(TransportError);
		try {
			transport.createSession({});
		} catch (error) {
			if (error instanceof TransportError) {
				expect(error.code).toBe('UNAUTHORIZED');
			}
		}
	});

	it('rejects actions without the required role', () => {
		const { manager } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			idFactory: vi.fn().mockReturnValue('forbidden-session'),
		});
		const limitedContext: RequestContext = {
			auth: {
				userId: 'tester',
				roles: ['session:create'],
				token: 'limited-token',
			},
		};
		const { sessionId } = transport.createSession({}, limitedContext);
		expect(() =>
			transport.advanceSession({ sessionId }, limitedContext),
		).toThrow(TransportError);
		try {
			transport.advanceSession({ sessionId }, limitedContext);
		} catch (error) {
			if (error instanceof TransportError) {
				expect(error.code).toBe('FORBIDDEN');
			}
		}
	});
});
