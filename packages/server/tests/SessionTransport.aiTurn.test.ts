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
				resources: {},
				stats: {},
				buildings: [],
				lands: [],
				passives: [],
			},
			after: {
				resources: {},
				stats: {},
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
		expect(Array.isArray(result.snapshot.recentValueChanges)).toBe(true);
		expect(
			(result.snapshot as Record<string, unknown>).recentResourceGains,
		).toBeUndefined();
		expect(Object.keys(result.registries.actions)).not.toHaveLength(0);
		expect(result.registries.resourceValues.globalActionCost).toBeDefined();
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
});
