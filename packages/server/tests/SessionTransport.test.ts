import { describe, it, expect, vi } from 'vitest';
import type { EngineSession } from '@kingdom-builder/engine';
import { SessionTransport } from '../src/transport/SessionTransport.js';
import { TransportError } from '../src/transport/TransportTypes.js';
import type { SessionManager } from '../src/session/SessionManager.js';
import { createTokenAuthMiddleware } from '../src/auth/tokenAuthMiddleware.js';
import { createSyntheticSessionManager } from './helpers/createSyntheticSessionManager.js';

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

	it('skips blank player name assignments when creating sessions', () => {
		const { manager } = createSyntheticSessionManager();
		const originalCreate = manager.createSession.bind(manager);
		const updates: Array<[string, string]> = [];
		vi.spyOn(manager, 'createSession').mockImplementation(
			(sessionId, options) => {
				const session = originalCreate(sessionId, options);
				vi.spyOn(session, 'updatePlayerName').mockImplementation(
					(playerId, playerName) => {
						updates.push([playerId, playerName]);
					},
				);
				return session;
			},
		);
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: middleware,
		});
		transport.createSession({
			body: {
				playerNames: { A: '   ', B: 'Bravo' },
			},
			headers: authorizedHeaders,
		});
		expect(updates).toEqual([['B', 'Bravo']]);
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

	it('allows admin tokens to satisfy role checks', async () => {
		const { manager } = createSyntheticSessionManager();
		const adminOnly = createTokenAuthMiddleware({
			tokens: {
				'admin-only': {
					userId: 'administrator',
					roles: ['admin'],
				},
			},
		});
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: adminOnly,
		});
		const { sessionId } = transport.createSession({
			body: {},
			headers: { authorization: 'Bearer admin-only' },
		});
		const response = await transport.advanceSession({
			body: { sessionId },
			headers: { authorization: 'Bearer admin-only' },
		});
		expect(response.sessionId).toBe(sessionId);
	});

	it('adds requirement failures to error responses when actions fail', async () => {
		const failure = {
			requirement: {
				type: 'requirement',
				method: 'verify',
				params: { key: 'resource', amount: 3 },
			},
			details: { missing: 3 },
			message: 'Need more resources.',
		};
		const session = {
			enqueue: vi.fn((factory: () => unknown) => Promise.resolve(factory())),
			performAction: vi.fn(() => {
				const error = new Error('Action failed');
				(error as { requirementFailure?: typeof failure }).requirementFailure =
					failure;
				throw error;
			}),
			getSnapshot: vi.fn(),
			advancePhase: vi.fn(),
			setDevMode: vi.fn(),
			updatePlayerName: vi.fn(),
		} as unknown as EngineSession;
		const manager = {
			createSession: vi.fn(),
			getSession: vi.fn().mockReturnValue(session),
			getSnapshot: vi.fn(),
		} as unknown as SessionManager;
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: middleware,
		});
		const result = await transport.executeAction({
			body: { sessionId: 'stub-session', actionId: 'test-action' },
			headers: authorizedHeaders,
		});
		expect(result.status).toBe('error');
		expect(result.httpStatus).toBe(409);
		expect(result.requirementFailure).toEqual(failure);
		expect(result.requirementFailure).not.toBe(failure);
		expect(result.requirementFailures).toEqual([failure]);
		expect(result.requirementFailures?.[0]).not.toBe(failure);
		failure.details.missing = 4;
		expect(result.requirementFailure?.details?.missing).toBe(3);
	});

	it('returns generic errors when action failures omit requirement details', async () => {
		const session = {
			enqueue: vi.fn(() => Promise.reject('failure')),
			performAction: vi.fn(),
			getSnapshot: vi.fn(),
			advancePhase: vi.fn(),
			setDevMode: vi.fn(),
			updatePlayerName: vi.fn(),
		} as unknown as EngineSession;
		const manager = {
			createSession: vi.fn(),
			getSession: vi.fn().mockReturnValue(session),
			getSnapshot: vi.fn(),
		} as unknown as SessionManager;
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: middleware,
		});
		const result = await transport.executeAction({
			body: { sessionId: 'generic-session', actionId: 'act' },
			headers: authorizedHeaders,
		});
		expect(result.status).toBe('error');
		expect(result.error).toBe('Action execution failed.');
		expect(result.requirementFailure).toBeUndefined();
		expect(result.requirementFailures).toBeUndefined();
		expect(result.httpStatus).toBe(409);
	});

	it('wraps session advancement failures in conflict errors', async () => {
		const session = {
			enqueue: vi.fn(() => Promise.reject(new Error('advance failed'))),
			advancePhase: vi.fn(),
			getSnapshot: vi.fn(),
			setDevMode: vi.fn(),
			updatePlayerName: vi.fn(),
		} as unknown as EngineSession;
		const manager = {
			createSession: vi.fn(),
			getSession: vi.fn().mockReturnValue(session),
			getSnapshot: vi.fn(),
		} as unknown as SessionManager;
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: middleware,
		});
		await expect(
			transport.advanceSession({
				body: { sessionId: 'advance-stub' },
				headers: authorizedHeaders,
			}),
		).rejects.toMatchObject({ code: 'CONFLICT' });
	});

	it('rethrows unexpected authorization middleware errors', () => {
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
				headers: {},
			}),
		).toThrowError(new Error('middleware exploded'));
	});

	it('throws when a unique session identifier cannot be generated', () => {
		const createSessionSpy = vi.fn();
		const manager = {
			createSession: createSessionSpy,
			getSession: vi.fn().mockReturnValue({}),
			getSnapshot: vi.fn(),
		} as unknown as SessionManager;
		const idFactory = vi.fn().mockReturnValue('duplicate-session');
		const transport = new SessionTransport({
			sessionManager: manager,
			idFactory,
			authMiddleware: middleware,
		});
		expect(() =>
			transport.createSession({
				body: {},
				headers: authorizedHeaders,
			}),
		).toThrow(TransportError);
		try {
			transport.createSession({
				body: {},
				headers: authorizedHeaders,
			});
		} catch (error) {
			if (error instanceof TransportError) {
				expect(error.code).toBe('CONFLICT');
			}
		}
		expect(createSessionSpy).not.toHaveBeenCalled();
	});

	it('requires configured authorization middleware', () => {
		const { manager } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
		});
		expect(() =>
			transport.createSession({
				body: {},
				headers: {},
			}),
		).toThrow(TransportError);
		try {
			transport.createSession({
				body: {},
				headers: {},
			});
		} catch (error) {
			if (error instanceof TransportError) {
				expect(error.code).toBe('UNAUTHORIZED');
			}
		}
	});
});
