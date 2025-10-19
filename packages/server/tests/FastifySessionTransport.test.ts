import fastify from 'fastify';
import { describe, it, expect, vi } from 'vitest';
import type {
	SessionSnapshot,
	SessionRuntimeConfigResponse,
	SessionRunAiResponse,
} from '@kingdom-builder/protocol';
import type { ActionTrace, EngineSession } from '@kingdom-builder/engine';
import type { EngineActionParameters } from '../src/transport/actionParameterHelpers.js';
import { normalizeActionTraces } from '../src/transport/engineTraceNormalizer.js';
import { createTokenAuthMiddleware } from '../src/auth/tokenAuthMiddleware.js';
import {
	createSessionTransportPlugin,
	type FastifySessionTransportOptions,
} from '../src/transport/FastifySessionTransport.js';
import {
	createSyntheticSessionManager,
	findAiPlayerId,
} from './helpers/createSyntheticSessionManager.js';
import {
	expectSnapshotMetadata,
	expectStaticMetadata,
} from './helpers/expectSnapshotMetadata.js';

describe('FastifySessionTransport', () => {
	const defaultTokens = {
		'session-manager': {
			userId: 'manager',
			roles: ['session:create', 'session:advance', 'admin'],
		},
	};

	const authorizedHeaders = {
		authorization: 'Bearer session-manager',
	} satisfies Record<string, string>;

	const limitedHeaders = {
		authorization: 'Bearer limited',
	} satisfies Record<string, string>;

	type SnapshotResponse = {
		snapshot: SessionSnapshot;
	};

	async function createServer(tokens = defaultTokens) {
		const {
			manager,
			actionId,
			gainKey,
			costKey,
			phases,
			start,
			rules,
			primaryIconId,
		} = createSyntheticSessionManager();
		const app = fastify();
		const options: FastifySessionTransportOptions = {
			sessionManager: manager,
			authMiddleware: createTokenAuthMiddleware({ tokens }),
		};
		await app.register(createSessionTransportPlugin, options);
		await app.ready();
		return {
			app,
			actionId,
			gainKey,
			costKey,
			manager,
			phases,
			start,
			rules,
			primaryIconId,
		};
	}

	it('creates sessions over HTTP', async () => {
		const { app, manager } = await createServer();
		const response = await app.inject({
			method: 'POST',
			url: '/sessions',
			headers: authorizedHeaders,
			payload: { devMode: true },
		});
		expect(response.statusCode).toBe(201);
		const body = response.json() as SnapshotResponse;
		expectSnapshotMetadata(body.snapshot.metadata);
		expect(body.snapshot.game.devMode).toBe(true);
		expectStaticMetadata(manager.getMetadata());
		await app.close();
	});

	it('retrieves snapshots for sessions', async () => {
		const { app, manager } = await createServer();
		const createResponse = await app.inject({
			method: 'POST',
			url: '/sessions',
			headers: authorizedHeaders,
			payload: {},
		});

		const { sessionId } = createResponse.json() as {
			sessionId: string;
		};
		const snapshotResponse = await app.inject({
			method: 'GET',
			url: `/sessions/${sessionId}/snapshot`,
			headers: authorizedHeaders,
		});
		expect(snapshotResponse.statusCode).toBe(200);
		const snapshot = snapshotResponse.json() as SnapshotResponse;
		expectSnapshotMetadata(snapshot.snapshot.metadata);
		expect(snapshot.snapshot.game.players).toHaveLength(2);
		expectStaticMetadata(manager.getMetadata());
		await app.close();
	});

	it('returns the runtime configuration without authentication', async () => {
		const { app, manager, gainKey, phases, start, rules, primaryIconId } =
			await createServer();
		const response = await app.inject({
			method: 'GET',
			url: '/runtime-config',
		});
		expect(response.statusCode).toBe(200);
		const body = response.json() as SessionRuntimeConfigResponse;
		expect(body.phases).toEqual(phases);
		expect(body.start).toEqual(start);
		expect(body.rules).toEqual(rules);
		expect(body.primaryIconId).toBe(primaryIconId);
		const resource = body.resources[gainKey];
		expect(resource).toBeDefined();
		expect(body).toEqual(manager.getRuntimeConfig());
		await app.close();
	});

	it('requires authorization for session snapshots', async () => {
		const tokens = {
			...defaultTokens,
			limited: { userId: 'limited', roles: ['session:create'] },
		} as const;
		const { app } = await createServer(tokens);
		const createResponse = await app.inject({
			method: 'POST',
			url: '/sessions',
			headers: authorizedHeaders,
			payload: {},
		});
		const { sessionId } = createResponse.json() as {
			sessionId: string;
		};
		const missingAuthResponse = await app.inject({
			method: 'GET',
			url: `/sessions/${sessionId}/snapshot`,
		});
		expect(missingAuthResponse.statusCode).toBe(401);
		const forbiddenResponse = await app.inject({
			method: 'GET',
			url: `/sessions/${sessionId}/snapshot`,
			headers: limitedHeaders,
		});
		expect(forbiddenResponse.statusCode).toBe(403);
		await app.close();
	});

	it('advances sessions through the API', async () => {
		const { app, manager } = await createServer();
		const createResponse = await app.inject({
			method: 'POST',
			url: '/sessions',
			headers: authorizedHeaders,
			payload: {},
		});
		const { sessionId } = createResponse.json() as { sessionId: string };
		const advanceResponse = await app.inject({
			method: 'POST',
			url: `/sessions/${sessionId}/advance`,
			headers: authorizedHeaders,
			payload: {},
		});
		expect(advanceResponse.statusCode).toBe(200);
		const advanceBody = advanceResponse.json() as SnapshotResponse;
		expectSnapshotMetadata(advanceBody.snapshot.metadata);
		expect(advanceBody.snapshot.game.currentPhase).toBe('end');
		expectStaticMetadata(manager.getMetadata());
		await app.close();
	});

	it('toggles developer mode through the API', async () => {
		const { app, manager } = await createServer();
		const createResponse = await app.inject({
			method: 'POST',
			url: '/sessions',
			headers: authorizedHeaders,
			payload: {},
		});
		const { sessionId, snapshot: createdSnapshot } =
			createResponse.json() as SnapshotResponse & {
				sessionId: string;
			};
		expectSnapshotMetadata(createdSnapshot.metadata);
		expect(createdSnapshot.game.devMode).toBe(false);
		expectStaticMetadata(manager.getMetadata());
		const devModeResponse = await app.inject({
			method: 'POST',
			url: `/sessions/${sessionId}/dev-mode`,
			headers: authorizedHeaders,
			payload: { enabled: true },
		});
		expect(devModeResponse.statusCode).toBe(200);
		const devModeBody = devModeResponse.json() as SnapshotResponse;
		expectSnapshotMetadata(devModeBody.snapshot.metadata);
		expect(devModeBody.snapshot.game.devMode).toBe(true);
		expectStaticMetadata(manager.getMetadata());
		await app.close();
	});

	it('updates player names through the API', async () => {
		const { app, manager } = await createServer();
		const createResponse = await app.inject({
			method: 'POST',
			url: '/sessions',
			headers: authorizedHeaders,
			payload: {},
		});
		const { sessionId } = createResponse.json() as { sessionId: string };
		const updateResponse = await app.inject({
			method: 'PATCH',
			url: `/sessions/${sessionId}/player`,
			headers: authorizedHeaders,
			payload: { playerId: 'A', playerName: ' Captain ' },
		});
		expect(updateResponse.statusCode).toBe(200);
		const body = updateResponse.json() as SnapshotResponse;
		expectSnapshotMetadata(body.snapshot.metadata);
		expect(body.snapshot.game.players[0]?.name).toBe('Captain');
		expectStaticMetadata(manager.getMetadata());
		await app.close();
	});

	it('executes actions and returns success payloads', async () => {
		const { app, actionId, gainKey, manager } = await createServer();
		const createResponse = await app.inject({
			method: 'POST',
			url: '/sessions',
			headers: authorizedHeaders,
			payload: {},
		});
		const { sessionId } = createResponse.json() as { sessionId: string };
		const actionResponse = await app.inject({
			method: 'POST',
			url: `/sessions/${sessionId}/actions`,
			headers: authorizedHeaders,
			payload: { actionId },
		});
		expect(actionResponse.statusCode).toBe(200);
		const actionBody = actionResponse.json() as SnapshotResponse & {
			status: string;
		};
		expect(actionBody.status).toBe('success');
		expectSnapshotMetadata(actionBody.snapshot.metadata);
		const [player] = actionBody.snapshot.game.players;
		expect(player?.resources[gainKey]).toBe(1);
		expectStaticMetadata(manager.getMetadata());
		await app.close();
	});

	it('returns action metadata over HTTP', async () => {
		const { app, actionId } = await createServer();
		const createResponse = await app.inject({
			method: 'POST',
			url: '/sessions',
			headers: authorizedHeaders,
			payload: {},
		});
		const { sessionId } = createResponse.json() as {
			sessionId: string;
		};
		const metadataBase = `/sessions/${sessionId}/actions/${actionId}`;
		const costResponse = await app.inject({
			method: 'POST',
			url: `${metadataBase}/costs`,
			headers: authorizedHeaders,
			payload: {},
		});
		expect(costResponse.statusCode).toBe(200);
		const costBody = costResponse.json() as {
			costs: Record<string, number>;
		};
		expect(typeof costBody.costs).toBe('object');
		const requirementResponse = await app.inject({
			method: 'POST',
			url: `${metadataBase}/requirements`,
			headers: authorizedHeaders,
			payload: {},
		});
		expect(requirementResponse.statusCode).toBe(200);
		const requirementBody = requirementResponse.json() as {
			requirements: unknown[];
		};
		expect(Array.isArray(requirementBody.requirements)).toBe(true);
		const optionsResponse = await app.inject({
			method: 'GET',
			url: `${metadataBase}/options`,
			headers: authorizedHeaders,
		});
		expect(optionsResponse.statusCode).toBe(200);
		const optionsBody = optionsResponse.json() as {
			groups: unknown[];
		};
		expect(Array.isArray(optionsBody.groups)).toBe(true);
		await app.close();
	});

	it('rejects invalid action payloads with protocol errors', async () => {
		const { app, manager } = await createServer();
		const createResponse = await app.inject({
			method: 'POST',
			url: '/sessions',
			headers: authorizedHeaders,
			payload: {},
		});
		const { sessionId } = createResponse.json() as { sessionId: string };
		const invalidResponse = await app.inject({
			method: 'POST',
			url: `/sessions/${sessionId}/actions`,
			headers: authorizedHeaders,
			payload: {},
		});
		expect(invalidResponse.statusCode).toBe(400);
		const invalidBody = invalidResponse.json() as {
			status: string;
			error: string;
		};
		expect(invalidBody.status).toBe('error');
		expect(invalidBody.error).toBe('Invalid action request.');
		expectStaticMetadata(manager.getMetadata());
		await app.close();
	});

	it('reports missing sessions when performing actions', async () => {
		const { app, actionId } = await createServer();
		const response = await app.inject({
			method: 'POST',
			url: `/sessions/missing-session/actions`,
			headers: authorizedHeaders,
			payload: { actionId },
		});
		expect(response.statusCode).toBe(404);
		const body = response.json() as {
			status: string;
			error: string;
		};
		expect(body.status).toBe('error');
		expect(body.error).toContain('was not found');
		await app.close();
	});

	it('runs AI turns through the API when controllers exist', async () => {
		const { app, manager, actionId, costKey } = await createServer();
		const createResponse = await app.inject({
			method: 'POST',
			url: '/sessions',
			headers: authorizedHeaders,
			payload: {},
		});
		const { sessionId } = createResponse.json() as {
			sessionId: string;
		};
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
		const response = await app.inject({
			method: 'POST',
			url: `/sessions/${sessionId}/ai-turn`,
			headers: authorizedHeaders,
			payload: { playerId },
		});
		expect(response.statusCode).toBe(200);
		const body = response.json() as SnapshotResponse & {
			sessionId: string;
			ranTurn: boolean;
			registries: { actions: Record<string, unknown> };
			actions: unknown[];
			phaseComplete: boolean;
		};
		expect(body.sessionId).toBe(sessionId);
		expect(body.ranTurn).toBe(true);
		expect(Array.isArray(body.actions)).toBe(true);
		expect(body.actions).toHaveLength(1);
		const [action] = body.actions as SessionRunAiResponse['actions'];
		expect(action.actionId).toBe(actionId);
		expect(action.params).toEqual(actionParams);
		expect(action.costs).toEqual({ [costKey]: 1 });
		expect(action.traces).toEqual(normalizeActionTraces(actionTraces));
		expect(body.phaseComplete).toBe(true);
		expectSnapshotMetadata(body.snapshot.metadata);
		expect(body.snapshot.game.currentPhase).toBeDefined();
		expect(Array.isArray(body.snapshot.recentResourceGains)).toBe(true);
		expectStaticMetadata(manager.getMetadata());
		expect(body.registries.actions).toBeDefined();
		expect(runSpy).toHaveBeenCalledTimes(1);
		const [, overrides] = runSpy.mock.calls[0]!;
		expect(overrides).toBeDefined();
		expect(advanceSpy).not.toHaveBeenCalled();
		expect(performSpy).toHaveBeenCalledTimes(1);
		expect(costSpy).toHaveBeenCalledTimes(1);
		await app.close();
	});

	it('returns conflicts when AI controllers are missing', async () => {
		const { app, manager } = await createServer();
		const createResponse = await app.inject({
			method: 'POST',
			url: '/sessions',
			headers: authorizedHeaders,
			payload: {},
		});
		const { sessionId } = createResponse.json() as {
			sessionId: string;
		};
		const session = manager.getSession(sessionId);
		expect(session).toBeDefined();
		if (!session) {
			throw new Error('Session was not created.');
		}
		const snapshot = session.getSnapshot();
		const nonAi = snapshot.game.players.find((entry) => {
			return !session.hasAiController(entry.id);
		});
		expect(nonAi).toBeDefined();
		if (!nonAi) {
			throw new Error('No non-AI player was found.');
		}
		const response = await app.inject({
			method: 'POST',
			url: `/sessions/${sessionId}/ai-turn`,
			headers: authorizedHeaders,
			payload: { playerId: nonAi.id },
		});
		expect(response.statusCode).toBe(409);
		const body = response.json() as {
			code: string;
		};
		expect(body.code).toBe('CONFLICT');
		expectStaticMetadata(manager.getMetadata());
		await app.close();
	});

	it('rejects AI requests from unauthorized callers', async () => {
		const { app, manager } = await createServer();
		const createResponse = await app.inject({
			method: 'POST',
			url: '/sessions',
			headers: authorizedHeaders,
			payload: {},
		});
		const { sessionId } = createResponse.json() as {
			sessionId: string;
		};
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
		const response = await app.inject({
			method: 'POST',
			url: `/sessions/${sessionId}/ai-turn`,
			payload: { playerId },
		});
		expect(response.statusCode).toBe(401);
		const body = response.json() as { code: string };
		expect(body.code).toBe('UNAUTHORIZED');
		expectStaticMetadata(manager.getMetadata());
		await app.close();
	});

	it('validates AI payloads over HTTP', async () => {
		const { app, manager } = await createServer();
		const createResponse = await app.inject({
			method: 'POST',
			url: '/sessions',
			headers: authorizedHeaders,
			payload: {},
		});
		const { sessionId } = createResponse.json() as {
			sessionId: string;
		};
		const session = manager.getSession(sessionId);
		expect(session).toBeDefined();
		if (!session) {
			throw new Error('Session was not created.');
		}
		const invalidResponse = await app.inject({
			method: 'POST',
			url: `/sessions/${sessionId}/ai-turn`,
			headers: authorizedHeaders,
			payload: { playerId: 42 },
		});
		expect(invalidResponse.statusCode).toBe(400);
		const body = invalidResponse.json() as { code: string };
		expect(body.code).toBe('INVALID_REQUEST');
		expectStaticMetadata(manager.getMetadata());
		await app.close();
	});

	it('simulates upcoming phases over HTTP', async () => {
		const { app, manager } = await createServer();
		const createResponse = await app.inject({
			method: 'POST',
			url: '/sessions',
			headers: authorizedHeaders,
			payload: {},
		});
		const { sessionId } = createResponse.json() as {
			sessionId: string;
		};
		const session = manager.getSession(sessionId);
		expect(session).toBeDefined();
		const expected = { forecast: [{ id: 'main' }] };
		const snapshotResp = await app.inject({
			method: 'GET',
			url: `/sessions/${sessionId}/snapshot`,
			headers: authorizedHeaders,
		});
		const snapshot = snapshotResp.json() as SnapshotResponse;
		const players = snapshot.snapshot.game.players;
		const playerId = players[0]?.id ?? null;
		expect(playerId).not.toBeNull();
		if (!playerId) {
			throw new Error('No player id was found in the snapshot.');
		}
		const simulateSpy = session
			? vi.spyOn(session, 'simulateUpcomingPhases').mockReturnValue(expected)
			: null;
		if (session) {
			vi.spyOn(session, 'enqueue').mockImplementation(async (factory) => {
				return await factory();
			});
		}
		const response = await app.inject({
			method: 'POST',
			url: `/sessions/${sessionId}/simulate`,
			headers: authorizedHeaders,
			payload: { playerId, options: { maxIterations: 2 } },
		});
		expect(response.statusCode).toBe(200);
		const body = response.json() as {
			result: unknown;
		};
		expect(body.result).toEqual(expected);
		expectStaticMetadata(manager.getMetadata());
		if (simulateSpy) {
			expect(simulateSpy).toHaveBeenCalledWith(playerId, {
				maxIterations: 2,
			});
		}
		await app.close();
	});

	it('returns 401 when authorization headers are missing', async () => {
		const { app, manager } = await createServer();
		const response = await app.inject({
			method: 'POST',
			url: '/sessions',
			payload: {},
		});
		expect(response.statusCode).toBe(401);
		const body = response.json() as { code: string };
		expect(body.code).toBe('UNAUTHORIZED');
		expectStaticMetadata(manager.getMetadata());
		await app.close();
	});

	it('returns 403 when token lacks required roles', async () => {
		const tokens = {
			'creator-only': { userId: 'creator', roles: ['session:create'] },
		};
		const { app } = await createServer(tokens);
		const createResponse = await app.inject({
			method: 'POST',
			url: '/sessions',
			headers: { authorization: 'Bearer creator-only' },
			payload: {},
		});
		const { sessionId } = createResponse.json() as { sessionId: string };
		const advanceResponse = await app.inject({
			method: 'POST',
			url: `/sessions/${sessionId}/advance`,
			headers: { authorization: 'Bearer creator-only' },
			payload: {},
		});
		expect(advanceResponse.statusCode).toBe(403);
		const body = advanceResponse.json() as { code: string };
		expect(body.code).toBe('FORBIDDEN');
		await app.close();
	});

	it('prefers the last authorization header value when multiple values are provided', async () => {
		const { app, manager } = await createServer();
		const response = await app.inject({
			method: 'POST',
			url: '/sessions',
			headers: {
				authorization: ['Bearer session-manager', 'Bearer invalid-token'],
			},
			payload: {},
		});
		expect(response.statusCode).toBe(403);
		expectStaticMetadata(manager.getMetadata());
		await app.close();
	});
});
