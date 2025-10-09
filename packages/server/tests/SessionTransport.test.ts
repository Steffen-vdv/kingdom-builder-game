import { describe, it, expect, vi } from 'vitest';
import { SessionTransport } from '../src/transport/SessionTransport.js';
import { TransportError } from '../src/transport/TransportTypes.js';
import { createTokenAuthMiddleware } from '../src/auth/tokenAuthMiddleware.js';
import { createSyntheticSessionManager } from './helpers/createSyntheticSessionManager.js';
import type { SessionRequirementFailure } from '@kingdom-builder/protocol';

describe('SessionTransport', () => {
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

	it('creates sessions and applies player preferences', () => {
		const { manager } = createSyntheticSessionManager();
		const idFactory = vi.fn().mockReturnValue('transport-session');
		const transport = new SessionTransport({
			sessionManager: manager,
			idFactory,
			authMiddleware: middleware,
		});
		const response = transport.createSession({
			body: {
				devMode: true,
				playerNames: { A: 'Alpha', B: 'Beta' },
			},
			headers: authorizedHeaders,
		});
		expect(response.sessionId).toBe('transport-session');
		expect(response.snapshot.game.devMode).toBe(true);
		const [playerA, playerB] = response.snapshot.game.players;
		expect(playerA?.name).toBe('Alpha');
		expect(playerB?.name).toBe('Beta');
	});

	it('skips blank player name entries when applying preferences', () => {
		const { manager } = createSyntheticSessionManager();
		const originalCreate = manager.createSession.bind(manager);
		let updateSpy: ReturnType<typeof vi.spyOn> | undefined;
		vi.spyOn(manager, 'createSession').mockImplementation(
			(sessionId, options) => {
				const session = originalCreate(sessionId, options);
				updateSpy = vi.spyOn(session, 'updatePlayerName');
				return session;
			},
		);
		const transport = new SessionTransport({
			sessionManager: manager,
			idFactory: vi.fn().mockReturnValue('naming-session'),
			authMiddleware: middleware,
		});
		const response = transport.createSession({
			body: { playerNames: { A: '   ', B: 'Bravo' } },
			headers: authorizedHeaders,
		});
		manager.createSession.mockRestore();
		expect(updateSpy).toBeDefined();
		expect(updateSpy?.mock.calls).toHaveLength(1);
		expect(updateSpy?.mock.calls[0]).toEqual(['B', 'Bravo']);
		const [playerA, playerB] = response.snapshot.game.players;
		expect(playerA?.name).not.toBe('   ');
		expect(playerB?.name).toBe('Bravo');
	});

	it('returns session state snapshots', () => {
		const { manager } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			idFactory: vi.fn().mockReturnValue('state-session'),
			authMiddleware: middleware,
		});
		const { sessionId } = transport.createSession({
			body: {},
			headers: authorizedHeaders,
		});
		const state = transport.getSessionState({
			body: { sessionId },
			headers: authorizedHeaders,
		});
		expect(state.sessionId).toBe(sessionId);
		expect(state.snapshot.game.players).toHaveLength(2);
	});

	it('advances sessions and reports results', async () => {
		const { manager } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			idFactory: vi.fn().mockReturnValue('advance-session'),
			authMiddleware: middleware,
		});
		const { sessionId } = transport.createSession({
			body: {},
			headers: authorizedHeaders,
		});
		const advance = await transport.advanceSession({
			body: { sessionId },
			headers: authorizedHeaders,
		});
		expect(advance.sessionId).toBe(sessionId);
		expect(advance.snapshot.game.currentPhase).toBe('end');
		expect(Array.isArray(advance.advance.effects)).toBe(true);
	});

	it('executes actions and returns updated snapshots', async () => {
		const { manager, gainKey, actionId } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: middleware,
		});
		const { sessionId } = transport.createSession({
			body: {},
			headers: authorizedHeaders,
		});
		const result = await transport.executeAction({
			body: { sessionId, actionId },
			headers: authorizedHeaders,
		});
		expect(result.status).toBe('success');
		const [player] = result.snapshot.game.players;
		expect(player?.resources[gainKey]).toBe(1);
		expect(Array.isArray(result.traces)).toBe(true);
		expect(result.httpStatus).toBe(200);
	});

	it('reports conflicts when advancing sessions fail', async () => {
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
		const conflict = new Error('advance failed');
		if (session) {
			vi.spyOn(session, 'enqueue').mockImplementation(() =>
				Promise.reject(conflict),
			);
		}
		await expect(
			transport.advanceSession({
				body: { sessionId },
				headers: authorizedHeaders,
			}),
		).rejects.toBeInstanceOf(TransportError);
		try {
			await transport.advanceSession({
				body: { sessionId },
				headers: authorizedHeaders,
			});
		} catch (error) {
			if (error instanceof TransportError) {
				expect(error.code).toBe('CONFLICT');
			}
		}
	});

	it('returns conflict responses when actions fail without requirement details', async () => {
		const { manager, actionId } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: middleware,
		});
		const { sessionId } = transport.createSession({
			body: {},
			headers: authorizedHeaders,
		});
		const session = manager.getSession(sessionId);
		const rejection = new Error('Action failure');
		if (session) {
			vi.spyOn(session, 'enqueue').mockImplementation(() =>
				Promise.reject(rejection),
			);
		}
		const result = await transport.executeAction({
			body: { sessionId, actionId, params: {} },
			headers: authorizedHeaders,
		});
		expect(result.status).toBe('error');
		expect(result.requirementFailure).toBeUndefined();
		expect(result.requirementFailures).toBeUndefined();
		expect(result.httpStatus).toBe(409);
	});

	it('returns requirement failures when action execution is rejected', async () => {
		const { manager, actionId } = createSyntheticSessionManager();
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
		const failure: SessionRequirementFailure = {
			requirement: {
				type: 'synthetic',
				method: 'deny',
				params: { flag: true },
			},
			message: 'Denied',
		};
		const rejection = new Error('Action execution failed.');
		(
			rejection as { requirementFailure?: SessionRequirementFailure }
		).requirementFailure = failure;
		if (session) {
			vi.spyOn(session, 'enqueue').mockImplementation(() =>
				Promise.reject(rejection),
			);
		}
		const result = await transport.executeAction({
			body: { sessionId, actionId, params: {} },
			headers: authorizedHeaders,
		});
		expect(result.status).toBe('error');
		expect(result.requirementFailure).toEqual(failure);
		expect(result.requirementFailures).toEqual([failure]);
		expect(result.httpStatus).toBe(409);
	});

	it('returns protocol errors for invalid action payloads', async () => {
		const { manager } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: middleware,
		});
		const { sessionId } = transport.createSession({
			body: {},
			headers: authorizedHeaders,
		});
		const result = await transport.executeAction({
			body: { sessionId },
			headers: authorizedHeaders,
		});
		expect(result.status).toBe('error');
		expect(result.error).toBe('Invalid action request.');
		expect(result.httpStatus).toBe(400);
	});

	it('reports missing sessions when executing actions', async () => {
		const { manager, actionId } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: middleware,
		});
		const result = await transport.executeAction({
			body: { sessionId: 'unknown', actionId },
			headers: authorizedHeaders,
		});
		expect(result.status).toBe('error');
		expect(result.error).toContain('was not found');
		expect(result.httpStatus).toBe(404);
	});

	it('toggles developer mode on demand', () => {
		const { manager } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			idFactory: vi.fn().mockReturnValue('dev-session'),
			authMiddleware: middleware,
		});
		const { sessionId } = transport.createSession({
			body: { devMode: false },
			headers: authorizedHeaders,
		});
		const updated = transport.setDevMode({
			body: { sessionId, enabled: true },
			headers: authorizedHeaders,
		});
		expect(updated.snapshot.game.devMode).toBe(true);
	});

	it('throws when a session cannot be located', () => {
		const { manager } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			idFactory: vi.fn().mockReturnValue('missing-session'),
			authMiddleware: middleware,
		});
		const expectNotFound = () =>
			transport.getSessionState({
				body: { sessionId: 'missing' },
				headers: authorizedHeaders,
			});
		expect(expectNotFound).toThrow(TransportError);
		try {
			expectNotFound();
		} catch (error) {
			if (error instanceof TransportError) {
				expect(error.code).toBe('NOT_FOUND');
			}
		}
	});

	it('validates incoming requests', async () => {
		const { manager } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			idFactory: vi.fn().mockReturnValue('validation-session'),
			authMiddleware: middleware,
		});
		await expect(
			transport.advanceSession({
				body: { sessionId: '' },
				headers: authorizedHeaders,
			}),
		).rejects.toBeInstanceOf(TransportError);
		try {
			await transport.advanceSession({
				body: { sessionId: '' },
				headers: authorizedHeaders,
			});
		} catch (error) {
			if (error instanceof TransportError) {
				expect(error.code).toBe('INVALID_REQUEST');
			}
		}
	});

	it('rejects requests without authentication tokens', () => {
		const { manager } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: middleware,
		});
		const attempt = () =>
			transport.createSession({
				body: {},
			});
		expect(attempt).toThrow(TransportError);
		try {
			attempt();
		} catch (error) {
			if (error instanceof TransportError) {
				expect(error.code).toBe('UNAUTHORIZED');
			}
		}
	});

	it('requires configured authorization middleware for protected operations', () => {
		const { manager } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
		});
		const attempt = () =>
			transport.createSession({
				body: {},
			});
		expect(attempt).toThrow(TransportError);
		try {
			attempt();
		} catch (error) {
			if (error instanceof TransportError) {
				expect(error.code).toBe('UNAUTHORIZED');
			}
		}
	});

	it('permits admin roles to satisfy authorization checks', () => {
		const { manager } = createSyntheticSessionManager();
		const adminMiddleware = createTokenAuthMiddleware({
			tokens: {
				admin: { userId: 'admin', roles: ['admin'] },
			},
		});
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: adminMiddleware,
		});
		const response = transport.createSession({
			body: {},
			headers: { authorization: 'Bearer admin' },
		});
		expect(response.sessionId).toBeDefined();
	});

	it('validates session identifiers before fetching state', () => {
		const { manager } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
		});
		const attempt = () =>
			transport.getSessionState({
				body: {},
			});
		expect(attempt).toThrow(TransportError);
		try {
			attempt();
		} catch (error) {
			if (error instanceof TransportError) {
				expect(error.code).toBe('INVALID_REQUEST');
			}
		}
	});

	it('fails when unique session identifiers cannot be generated', () => {
		const { manager } = createSyntheticSessionManager();
		manager.createSession('collision');
		const idFactory = vi.fn().mockReturnValue('collision');
		const transport = new SessionTransport({
			sessionManager: manager,
			idFactory,
			authMiddleware: middleware,
		});
		let thrown: unknown;
		try {
			transport.createSession({
				body: {},
				headers: authorizedHeaders,
			});
		} catch (error) {
			thrown = error;
		}
		expect(thrown).toBeInstanceOf(TransportError);
		if (thrown instanceof TransportError) {
			expect(thrown.code).toBe('CONFLICT');
		}
		expect(idFactory).toHaveBeenCalledTimes(10);
	});

	it('validates dev mode toggles before applying them', () => {
		const { manager } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
		});
		const attempt = () =>
			transport.setDevMode({
				body: { sessionId: 123 },
			});
		expect(attempt).toThrow(TransportError);
		try {
			attempt();
		} catch (error) {
			if (error instanceof TransportError) {
				expect(error.code).toBe('INVALID_REQUEST');
			}
		}
	});
	it('rejects tokens that are not authorized for actions', async () => {
		const { manager } = createSyntheticSessionManager();
		const limited = createTokenAuthMiddleware({
			tokens: {
				'creator-only': {
					userId: 'creator',
					roles: ['session:create'],
				},
			},
		});
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: limited,
		});
		const { sessionId } = transport.createSession({
			body: {},
			headers: { authorization: 'Bearer creator-only' },
		});
		await expect(
			transport.advanceSession({
				body: { sessionId },
				headers: { authorization: 'Bearer creator-only' },
			}),
		).rejects.toBeInstanceOf(TransportError);
		try {
			await transport.advanceSession({
				body: { sessionId },
				headers: { authorization: 'Bearer creator-only' },
			});
		} catch (error) {
			if (error instanceof TransportError) {
				expect(error.code).toBe('FORBIDDEN');
			}
		}
	});
	it('propagates unexpected authorization errors', () => {
		const { manager } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: () => {
				throw new Error('middleware exploded');
			},
		});
		expect(() =>
			transport.createSession({
				body: {},
				headers: { authorization: 'Bearer failing' },
			}),
		).toThrowError(/middleware exploded/);
	});
});
