import { describe, it, expect, vi } from 'vitest';
import type { ActionTrace, EngineSession } from '@kingdom-builder/engine';
import type { EngineActionParameters } from '../src/transport/actionParameterHelpers.js';
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
import { normalizeActionTraces } from '../src/transport/engineTraceNormalizer.js';

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
		const { manager, actionId, costKey } = createSyntheticSessionManager();
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
		const actionParams = {
			choices: { primary: { optionId: 'primary-option' } },
		} as EngineActionParameters;
		const actionTraces: ActionTrace[] = [
			{
				id: 'trace-1',
				before: {
					resources: { [costKey]: 1 },
					stats: {},
					buildings: [],
					lands: [],
					passives: [],
				},
				after: {
					resources: { [costKey]: 0 },
					stats: {},
					buildings: [],
					lands: [],
					passives: [],
				},
			},
		];
		const performSpy = vi
			.spyOn(session, 'performAction')
			.mockImplementation(() => actionTraces);
		const costSpy = vi
			.spyOn(session, 'getActionCosts')
			.mockImplementation(() => {
				return {
					[costKey]: 1,
					ignore: 'skip',
				} as unknown as ReturnType<EngineSession['getActionCosts']>;
			});
		const advanceSpy = vi.spyOn(session, 'advancePhase');
		const runSpy = vi
			.spyOn(session, 'runAiTurn')
			.mockImplementation(async (id, overrides) => {
				expect(id).toBe(playerId);
				expect(overrides).toBeDefined();
				const perform = overrides?.performAction;
				const advance = overrides?.advance;
				const cont = overrides?.continueAfterAction;
				expect(typeof perform).toBe('function');
				expect(typeof advance).toBe('function');
				expect(typeof cont).toBe('function');
				if (!perform || !advance || !cont) {
					return true;
				}
				await perform(actionId, {} as never, actionParams);
				expect(await cont(actionId, {} as never, actionTraces)).toBe(false);
				await perform(actionId, {} as never, undefined);
				await advance({} as never);
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
		expect(result.phaseComplete).toBe(true);
		expect(result.actions).toHaveLength(1);
		const [action] = result.actions;
		expect(action.actionId).toBe(actionId);
		expect(action.params).toEqual(actionParams);
		expect(action.costs).toEqual({ [costKey]: 1 });
		expect(action.traces).toEqual(normalizeActionTraces(actionTraces));
		expectSnapshotMetadata(result.snapshot.metadata);
		expect(result.snapshot.game.currentPhase).toBeDefined();
		expect(Array.isArray(result.snapshot.recentResourceGains)).toBe(true);
		expect(Object.keys(result.registries.actions)).not.toHaveLength(0);
		expectStaticMetadata(manager.getMetadata());
		expect(runSpy).toHaveBeenCalledTimes(1);
		const [, overrides] = runSpy.mock.calls[0]!;
		expect(overrides).toBeDefined();
		expect(advanceSpy).not.toHaveBeenCalled();
		expect(performSpy).toHaveBeenCalledTimes(1);
		expect(costSpy).toHaveBeenCalledTimes(1);
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
