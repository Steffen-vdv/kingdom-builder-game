import { describe, it, expect, vi } from 'vitest';
import type { ActionTrace } from '@kingdom-builder/protocol';
import { SessionTransport } from '../src/transport/SessionTransport.js';
import { createTokenAuthMiddleware } from '../src/auth/tokenAuthMiddleware.js';
import {
	createSyntheticSessionManager,
	findAiPlayerId,
} from './helpers/createSyntheticSessionManager.js';
import { TransportError } from '../src/transport/TransportTypes.js';
import {
	expectSnapshotMetadata,
	expectStaticMetadata,
} from './helpers/expectSnapshotMetadata.js';

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
	it('runs AI turns when controllers are available', async () => {
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
		expect(session).toBeDefined();
		if (!session) {
			throw new Error('Session was not created.');
		}
		const playerId = findAiPlayerId(session);
		expect(playerId).not.toBeNull();
		if (playerId === null) {
			throw new Error('No AI controller was available.');
		}
		const fakeTrace: ActionTrace = {
			id: 'trace',
			before: {
				valuesV2: {},
				buildings: [],
				lands: [],
				passives: [],
			},
			after: {
				valuesV2: {},
				buildings: [],
				lands: [],
				passives: [],
			},
		};
		const performSpy = vi
			.spyOn(session, 'performAction')
			.mockReturnValue([fakeTrace]);
		const advanceSpy = vi.spyOn(session, 'advancePhase');
		vi.spyOn(session, 'getActionCosts').mockImplementation(() => {
			return { gold: 2, invalid: null } as never;
		});
		const runSpy = vi
			.spyOn(session, 'runAiTurn')
			.mockImplementation(async (_player, overrides) => {
				if (!overrides) {
					return true;
				}
				await overrides.performAction?.('tax', {} as never);
				await overrides.performAction?.('tax', {} as never);
				await overrides.advance?.({} as never);
				return true;
			});
		vi.spyOn(session, 'enqueue').mockImplementation(async (factory) => {
			return await factory();
		});
		const result = await transport.runAiTurn({
			body: { sessionId, playerId },
			headers: authorizedHeaders,
		});
		expect(result.sessionId).toBe(sessionId);
		expect(result.ranTurn).toBe(true);
		expect(result.actions).toHaveLength(1);
		const [action] = result.actions;
		expect(action.actionId).toBe('tax');
		expect(action.costs).toEqual({ gold: 2 });
		expect(Array.isArray(action.traces)).toBe(true);
		expect(action.traces.length).toBeGreaterThan(0);
		expect(result.phaseComplete).toBe(true);
		expectSnapshotMetadata(result.snapshot.metadata);
		expect(result.snapshot.game.currentPhase).toBeDefined();
		expect(Array.isArray(result.snapshot.recentResourceGains)).toBe(true);
		expect(Object.keys(result.registries.actions)).not.toHaveLength(0);
		expectStaticMetadata(manager.getMetadata());
		expect(runSpy).toHaveBeenCalledWith(playerId, expect.any(Object));
		expect(performSpy).toHaveBeenCalledTimes(1);
		expect(advanceSpy).not.toHaveBeenCalled();
	});

	it('rejects AI requests when controllers are missing', async () => {
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
		expect(session).toBeDefined();
		if (!session) {
			throw new Error('Session was not created.');
		}
		const snapshot = session.getSnapshot();
		const missing = snapshot.game.players.find((player) => {
			return !session.hasAiController(player.id);
		});
		expect(missing).toBeDefined();
		if (!missing) {
			throw new Error('No human-controlled player was found.');
		}
		const attempt = transport.runAiTurn({
			body: { sessionId, playerId: missing.id },
			headers: authorizedHeaders,
		});
		await expect(attempt).rejects.toBeInstanceOf(TransportError);
		await attempt.catch((error) => {
			if (error instanceof TransportError) {
				expect(error.code).toBe('CONFLICT');
			}
		});
	});

	it('validates AI request payloads', async () => {
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
		expect(session).toBeDefined();
		if (!session) {
			throw new Error('Session was not created.');
		}
		const playerId = findAiPlayerId(session);
		expect(playerId).not.toBeNull();
		if (playerId === null) {
			throw new Error('No AI controller was available.');
		}
		const invalidBody = { sessionId: 123, playerId } as unknown;
		const attempt = transport.runAiTurn({
			body: invalidBody,
			headers: authorizedHeaders,
		});
		await expect(attempt).rejects.toBeInstanceOf(TransportError);
		await attempt.catch((error) => {
			if (error instanceof TransportError) {
				expect(error.code).toBe('INVALID_REQUEST');
			}
		});
	});

	it('wraps AI execution errors in transport errors', async () => {
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
		expect(session).toBeDefined();
		if (!session) {
			throw new Error('Session was not created.');
		}
		const playerId = findAiPlayerId(session);
		expect(playerId).not.toBeNull();
		if (playerId === null) {
			throw new Error('No AI controller was available.');
		}
		vi.spyOn(session, 'enqueue').mockImplementation(() => {
			throw new Error('AI execution failed');
		});
		const attempt = transport.runAiTurn({
			body: { sessionId, playerId },
			headers: authorizedHeaders,
		});
		await expect(attempt).rejects.toBeInstanceOf(TransportError);
		await attempt.catch((error) => {
			if (error instanceof TransportError) {
				expect(error.code).toBe('CONFLICT');
				expect(error.message).toBe('Failed to execute AI turn.');
			}
		});
	});

	it('includes params in action records when available', async () => {
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
		expect(session).toBeDefined();
		if (!session) {
			throw new Error('Session was not created.');
		}
		const playerId = findAiPlayerId(session);
		expect(playerId).not.toBeNull();
		if (playerId === null) {
			throw new Error('No AI controller was available.');
		}
		const fakeTrace: ActionTrace = {
			id: 'trace',
			before: {
				valuesV2: {},
				buildings: [],
				lands: [],
				passives: [],
			},
			after: {
				valuesV2: {},
				buildings: [],
				lands: [],
				passives: [],
			},
		};
		vi.spyOn(session, 'performAction').mockReturnValue([fakeTrace]);
		vi.spyOn(session, 'getActionCosts').mockReturnValue({});
		const testParams = { choices: { primary: { optionId: 'test' } } };
		vi.spyOn(session, 'runAiTurn').mockImplementation(
			async (_player, overrides) => {
				if (!overrides) {
					return true;
				}
				await overrides.performAction?.('action', {} as never, testParams);
				return true;
			},
		);
		vi.spyOn(session, 'enqueue').mockImplementation(async (factory) => {
			return await factory();
		});
		const result = await transport.runAiTurn({
			body: { sessionId, playerId },
			headers: authorizedHeaders,
		});
		expect(result.actions).toHaveLength(1);
		expect(result.actions[0].params).toEqual(testParams);
	});

	it('handles AI turns that do not perform any actions', async () => {
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
		expect(session).toBeDefined();
		if (!session) {
			throw new Error('Session was not created.');
		}
		const playerId = findAiPlayerId(session);
		expect(playerId).not.toBeNull();
		if (playerId === null) {
			throw new Error('No AI controller was available.');
		}
		vi.spyOn(session, 'runAiTurn').mockImplementation(
			async (_player, overrides) => {
				if (overrides) {
					await overrides.advance?.({} as never);
				}
				return true;
			},
		);
		vi.spyOn(session, 'enqueue').mockImplementation(async (factory) => {
			return await factory();
		});
		const result = await transport.runAiTurn({
			body: { sessionId, playerId },
			headers: authorizedHeaders,
		});
		expect(result.actions).toHaveLength(0);
		expect(result.phaseComplete).toBe(true);
		expect(result.ranTurn).toBe(true);
	});

	it('returns false ranTurn when AI chooses not to act', async () => {
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
		expect(session).toBeDefined();
		if (!session) {
			throw new Error('Session was not created.');
		}
		const playerId = findAiPlayerId(session);
		expect(playerId).not.toBeNull();
		if (playerId === null) {
			throw new Error('No AI controller was available.');
		}
		vi.spyOn(session, 'runAiTurn').mockResolvedValue(false);
		vi.spyOn(session, 'enqueue').mockImplementation(async (factory) => {
			return await factory();
		});
		const result = await transport.runAiTurn({
			body: { sessionId, playerId },
			headers: authorizedHeaders,
		});
		expect(result.ranTurn).toBe(false);
		expect(result.actions).toHaveLength(0);
		expect(result.phaseComplete).toBe(false);
	});

	it('propagates unexpected action errors with details for frontend', async () => {
		// This test ensures that engine bugs (like the 0.5 integer validation
		// error) properly propagate through the API so the frontend can show
		// an error screen with details.
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
		expect(session).toBeDefined();
		if (!session) {
			throw new Error('Session was not created.');
		}
		const playerId = findAiPlayerId(session);
		expect(playerId).not.toBeNull();
		if (playerId === null) {
			throw new Error('No AI controller was available.');
		}
		// Simulate an unexpected engine error during AI action
		const engineBugMessage =
			'ResourceV2 state expected "resource:core:happiness" value to be an ' +
			'integer but received 0.5.';
		vi.spyOn(session, 'runAiTurn').mockRejectedValue(
			new Error(engineBugMessage),
		);
		vi.spyOn(session, 'enqueue').mockImplementation(async (factory) => {
			return await factory();
		});
		const attempt = transport.runAiTurn({
			body: { sessionId, playerId },
			headers: authorizedHeaders,
		});
		await expect(attempt).rejects.toBeInstanceOf(TransportError);
		await attempt.catch((error) => {
			if (error instanceof TransportError) {
				// Error should be wrapped as CONFLICT for frontend handling
				expect(error.code).toBe('CONFLICT');
				// Original error message should be preserved for debugging
				expect(error.message).toBe('Failed to execute AI turn.');
			}
		});
	});
});
