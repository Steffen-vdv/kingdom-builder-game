import { describe, it, expect, vi } from 'vitest';
import type { EngineSession } from '@kingdom-builder/engine';
import type { SessionRequirementFailure } from '@kingdom-builder/protocol';
import { SessionTransport } from '../src/transport/SessionTransport.js';
import { TransportError } from '../src/transport/TransportTypes.js';
import { createTokenAuthMiddleware } from '../src/auth/tokenAuthMiddleware.js';
import { createSyntheticSessionManager } from './helpers/createSyntheticSessionManager.js';

type SyntheticManager = ReturnType<
	typeof createSyntheticSessionManager
>['manager'];

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

	it('allows admin users to satisfy role checks', () => {
		const { manager } = createSyntheticSessionManager();
		const adminOnly = createTokenAuthMiddleware({
			tokens: {
				admin: {
					userId: 'admin',
					roles: ['admin'],
				},
			},
		});
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: adminOnly,
		});
		const response = transport.createSession({
			body: {},
			headers: { authorization: 'Bearer admin' },
		});
		expect(response.sessionId).toBeDefined();
	});

	it('throws when authorization middleware is missing', () => {
		const { manager } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
		});
		expect(() =>
			transport.createSession({
				body: {},
			}),
		).toThrow(TransportError);
		try {
			transport.createSession({ body: {} });
		} catch (error) {
			expect(error).toBeInstanceOf(TransportError);
			if (error instanceof TransportError) {
				expect(error.code).toBe('UNAUTHORIZED');
			}
		}
	});

	it('wraps authorization failures as transport errors', () => {
		const { manager } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: () => ({ userId: 'user', roles: [] }),
		});
		expect(() =>
			transport.createSession({
				body: {},
				headers: {},
			}),
		).toThrow(TransportError);
		try {
			transport.createSession({ body: {}, headers: {} });
		} catch (error) {
			expect(error).toBeInstanceOf(TransportError);
			if (error instanceof TransportError) {
				expect(error.code).toBe('FORBIDDEN');
			}
		}
	});

	it('extracts requirement failures from errors', async () => {
		const failure: SessionRequirementFailure = {
			requirement: {
				type: 'resource',
				method: 'min',
				params: { key: 'gold', amount: 1 },
			},
			message: 'no gold',
		};
		const session = {
			enqueue: vi.fn().mockRejectedValue({
				message: 'blocked',
				requirementFailure: failure,
			}),
		} as unknown as EngineSession;
		const transport = new SessionTransport({
			sessionManager: {
				getSession: vi.fn().mockReturnValue(session),
			} as unknown as SyntheticManager,
			authMiddleware: () => ({
				userId: 'user',
				roles: ['session:advance'],
			}),
		});
		const result = await transport.executeAction({
			body: { sessionId: 'missing', actionId: 'action' },
			headers: { authorization: 'Bearer token' },
		});
		expect(result.status).toBe('error');
		expect(result.httpStatus).toBe(409);
		expect(result.requirementFailure).toEqual(failure);
		expect(result.requirementFailure).not.toBe(failure);
	});

	it('attaches http status without making it enumerable', () => {
		const transport = new SessionTransport({
			sessionManager: {
				getSession: vi.fn().mockReturnValue(undefined),
			} as unknown as SyntheticManager,
		});
		const { attachHttpStatus } = transport as unknown as {
			attachHttpStatus: <T extends object>(
				payload: T,
				status: number,
			) => T & {
				httpStatus: number;
			};
		};
		const result = attachHttpStatus({ status: 'ok' }, 201);
		expect(result.httpStatus).toBe(201);
		expect(Object.keys(result)).not.toContain('httpStatus');
	});

	it('ignores blank player names when applying preferences', () => {
		const transport = new SessionTransport({
			sessionManager: {
				getSession: vi.fn().mockReturnValue(undefined),
			} as unknown as SyntheticManager,
		});
		const { applyPlayerNames } = transport as unknown as {
			applyPlayerNames: (
				session: EngineSession,
				names: Record<string, string | undefined>,
			) => void;
		};
		const updatePlayerName = vi.fn();
		const session = {
			updatePlayerName,
		} as unknown as EngineSession;
		applyPlayerNames(session, {
			A: 'Alice',
			B: '   ',
			C: undefined,
			D: '',
		});
		expect(updatePlayerName).toHaveBeenCalledTimes(1);
		expect(updatePlayerName).toHaveBeenCalledWith('A', 'Alice');
	});

	it('fails when generated session ids are not unique', () => {
		const getSession = vi.fn().mockReturnValue({});
		const manager = {
			getSession,
		} as unknown as SyntheticManager;
		const transport = new SessionTransport({
			sessionManager: manager,
			idFactory: () => 'duplicate',
		});
		const helper = transport as unknown as {
			generateSessionId: () => string;
		};
		let caught: unknown;
		try {
			helper.generateSessionId();
		} catch (error) {
			caught = error;
		}
		expect(caught).toBeInstanceOf(TransportError);
		if (caught instanceof TransportError) {
			expect(caught.code).toBe('CONFLICT');
		}
		expect(getSession).toHaveBeenCalledTimes(10);
	});
});
