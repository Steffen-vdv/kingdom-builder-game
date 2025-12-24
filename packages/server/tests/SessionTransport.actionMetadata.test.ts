import { describe, it, expect, vi, afterEach } from 'vitest';
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

describe('SessionTransport action metadata', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('returns sanitized action costs', async () => {
		const { manager, actionId } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: middleware,
		});
		const { sessionId } = await transport.createSession({
			body: {},
			headers: authorizedHeaders,
		});
		const session = await manager.getSession(sessionId);
		expect(session).toBeDefined();
		const expectedCosts: Record<string, number> = {};
		const rawCosts = session?.getActionCosts(actionId) ?? {};
		for (const [resourceKey, amount] of Object.entries(rawCosts)) {
			if (typeof amount === 'number') {
				expectedCosts[resourceKey] = amount;
			}
		}
		const result = await transport.getActionCosts({
			body: { sessionId, actionId },
			headers: authorizedHeaders,
		});
		expect(result.sessionId).toBe(sessionId);
		expect(result.costs).toEqual(expectedCosts);
	});

	it('returns requirements for actions', async () => {
		const { manager, actionId } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: middleware,
		});
		const { sessionId } = await transport.createSession({
			body: {},
			headers: authorizedHeaders,
		});
		const requirements = await transport.getActionRequirements({
			body: { sessionId, actionId },
			headers: authorizedHeaders,
		});
		expect(requirements.sessionId).toBe(sessionId);
		expect(Array.isArray(requirements.requirements)).toBe(true);
	});

	it('returns effect groups for actions', async () => {
		const { manager, actionId } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: middleware,
		});
		const { sessionId } = await transport.createSession({
			body: {},
			headers: authorizedHeaders,
		});
		const options = await transport.getActionOptions({
			body: { sessionId, actionId },
			headers: authorizedHeaders,
		});
		expect(options.sessionId).toBe(sessionId);
		expect(Array.isArray(options.groups)).toBe(true);
	});

	it('validates metadata request payloads', async () => {
		const { manager } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: middleware,
		});
		await transport.createSession({
			body: {},
			headers: authorizedHeaders,
		});
		await expect(
			transport.getActionCosts({
				body: {},
				headers: authorizedHeaders,
			}),
		).rejects.toThrowError(TransportError);
		await expect(
			transport.getActionRequirements({
				body: {},
				headers: authorizedHeaders,
			}),
		).rejects.toThrowError(TransportError);
		await expect(
			transport.getActionOptions({
				body: {},
				headers: authorizedHeaders,
			}),
		).rejects.toThrowError(TransportError);
	});

	it('reports unknown actions for metadata lookups', async () => {
		const { manager } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: middleware,
		});
		const { sessionId } = await transport.createSession({
			body: {},
			headers: authorizedHeaders,
		});
		await expect(
			transport.getActionCosts({
				body: { sessionId, actionId: 'missing' },
				headers: authorizedHeaders,
			}),
		).rejects.toThrowError(/was not found/);
		await expect(
			transport.getActionRequirements({
				body: { sessionId, actionId: 'missing' },
				headers: authorizedHeaders,
			}),
		).rejects.toThrowError(/was not found/);
		await expect(
			transport.getActionOptions({
				body: { sessionId, actionId: 'missing' },
				headers: authorizedHeaders,
			}),
		).rejects.toThrowError(/was not found/);
	});

	it('wraps errors thrown while loading action definitions', async () => {
		const { manager, actionId } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: middleware,
		});
		const { sessionId } = await transport.createSession({
			body: {},
			headers: authorizedHeaders,
		});
		const session = await manager.getSession(sessionId);
		expect(session).toBeDefined();
		if (!session) {
			throw new Error('Session was not created.');
		}
		vi.spyOn(session, 'getActionDefinition').mockImplementation(() => {
			throw new Error('registry failure');
		});
		await expect(
			transport.getActionCosts({
				body: { sessionId, actionId },
				headers: authorizedHeaders,
			}),
		).rejects.toThrowError(/was not found/);
	});

	it('validates action parameters before forwarding requests', async () => {
		const { manager, actionId } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: middleware,
		});
		const { sessionId } = await transport.createSession({
			body: {},
			headers: authorizedHeaders,
		});
		const params = {
			choices: {
				primary: {
					optionId: 'synthetic:choice',
				},
			},
		} as const;
		const session = await manager.getSession(sessionId);
		expect(session).toBeDefined();
		if (!session) {
			throw new Error('Session was not created.');
		}
		const playerId = session.getSnapshot().game.players[0]!.id;
		const costSpy = vi
			.spyOn(session, 'getActionCosts')
			.mockReturnValue({} as never);
		await transport.getActionCosts({
			body: { sessionId, actionId, params, playerId },
			headers: authorizedHeaders,
		});
		expect(costSpy).toHaveBeenCalledWith(actionId, params, playerId);
	});

	it('rejects malformed action parameter payloads', async () => {
		const { manager, actionId } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: middleware,
		});
		const { sessionId } = await transport.createSession({
			body: {},
			headers: authorizedHeaders,
		});
		await expect(
			transport.getActionCosts({
				body: {
					sessionId,
					actionId,
					params: {
						choices: {
							invalid: {
								optionId: 123,
							},
						},
					},
				},
				headers: authorizedHeaders,
			}),
		).rejects.toThrowError(TransportError);
		try {
			await transport.getActionCosts({
				body: {
					sessionId,
					actionId,
					params: {
						choices: {
							invalid: {
								optionId: 123,
							},
						},
					},
				},
				headers: authorizedHeaders,
			});
		} catch (error) {
			if (error instanceof TransportError) {
				expect(error.code).toBe('INVALID_REQUEST');
			}
		}
	});

	it('rejects actions when getActionDefinition returns undefined', async () => {
		const { manager, actionId } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: middleware,
		});
		const { sessionId } = await transport.createSession({
			body: {},
			headers: authorizedHeaders,
		});
		const session = await manager.getSession(sessionId);
		expect(session).toBeDefined();
		if (!session) {
			throw new Error('Session was not created.');
		}
		vi.spyOn(session, 'getActionDefinition').mockReturnValue(undefined);
		await expect(
			transport.getActionCosts({
				body: { sessionId, actionId },
				headers: authorizedHeaders,
			}),
		).rejects.toThrowError(TransportError);
		try {
			await transport.getActionCosts({
				body: { sessionId, actionId },
				headers: authorizedHeaders,
			});
		} catch (error) {
			if (error instanceof TransportError) {
				expect(error.code).toBe('NOT_FOUND');
				expect(error.message).toContain('was not found');
			}
		}
	});
});
