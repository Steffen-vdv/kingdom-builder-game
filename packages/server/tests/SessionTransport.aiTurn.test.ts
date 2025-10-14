import { describe, it, expect, vi } from 'vitest';
import { SessionTransport } from '../src/transport/SessionTransport.js';
import { createTokenAuthMiddleware } from '../src/auth/tokenAuthMiddleware.js';
import {
	createSyntheticSessionManager,
	findAiPlayerId,
} from './helpers/createSyntheticSessionManager.js';
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
		const runSpy = vi.spyOn(session, 'runAiTurn').mockResolvedValue(true);
		vi.spyOn(session, 'enqueue').mockImplementation(async (factory) => {
			return await factory();
		});
		const result = await transport.runAiTurn({
			body: { sessionId, playerId },
			headers: authorizedHeaders,
		});
		expect(result.sessionId).toBe(sessionId);
		expect(result.ranTurn).toBe(true);
		expect(result.snapshot.game.currentPhase).toBeDefined();
		expect(Array.isArray(result.snapshot.recentResourceGains)).toBe(true);
		expect(result.snapshot.metadata.passiveEvaluationModifiers).toBeDefined();
		expect(Object.keys(result.registries.actions)).not.toHaveLength(0);
		expect(runSpy).toHaveBeenCalledWith(playerId);
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
