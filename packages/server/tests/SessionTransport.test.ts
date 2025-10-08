import { describe, it, expect, vi } from 'vitest';
import {
	SessionTransport,
	TransportError,
} from '../src/transport/SessionTransport.js';
import { createSyntheticSessionManager } from './helpers/createSyntheticSessionManager.js';

describe('SessionTransport', () => {
	it('creates sessions and applies player preferences', () => {
		const { manager } = createSyntheticSessionManager();
		const idFactory = vi.fn().mockReturnValue('transport-session');
		const transport = new SessionTransport({
			sessionManager: manager,
			idFactory,
		});
		const response = transport.createSession({
			devMode: true,
			playerNames: { A: 'Alpha', B: 'Beta' },
		});
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
		const { sessionId } = transport.createSession({});
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
		const { sessionId } = transport.createSession({});
		const advance = transport.advanceSession({ sessionId });
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
		const { sessionId } = transport.createSession({
			devMode: false,
		});
		const updated = transport.setDevMode({
			sessionId,
			enabled: true,
		});
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
		expect(() => transport.advanceSession({ sessionId: '' })).toThrow(
			TransportError,
		);
		try {
			transport.advanceSession({ sessionId: '' });
		} catch (error) {
			if (error instanceof TransportError) {
				expect(error.code).toBe('INVALID_REQUEST');
			}
		}
	});
});
