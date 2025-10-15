import fastify from 'fastify';
import { describe, it, expect, vi } from 'vitest';
import type {
	SessionRegistriesPayload,
	SessionSnapshotMetadata,
} from '@kingdom-builder/protocol';
import { createTokenAuthMiddleware } from '../src/auth/tokenAuthMiddleware.js';
import {
	createSessionTransportPlugin,
	type FastifySessionTransportOptions,
} from '../src/transport/FastifySessionTransport.js';
import {
	createSyntheticSessionManager,
	findAiPlayerId,
} from './helpers/createSyntheticSessionManager.js';

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

	type SnapshotResponse = {
		snapshot: {
			game: { players: Array<{ id: string }>; currentPhase?: string };
			recentResourceGains?: unknown[];
			metadata: SessionSnapshotMetadata;
		};
	};

	type RegistriesResponse = {
		registries: SessionRegistriesPayload;
	};

	async function createServer(tokens = defaultTokens) {
		const { manager, actionId, gainKey } = createSyntheticSessionManager();
		const app = fastify();
		const options: FastifySessionTransportOptions = {
			sessionManager: manager,
			authMiddleware: createTokenAuthMiddleware({ tokens }),
		};
		await app.register(createSessionTransportPlugin, options);
		await app.ready();
		return { app, actionId, gainKey, manager };
	}

	it('creates sessions over HTTP', async () => {
		const { app } = await createServer();
		const response = await app.inject({
			method: 'POST',
			url: '/sessions',
			headers: authorizedHeaders,
			payload: { devMode: true },
		});
		expect(response.statusCode).toBe(201);
		const body = response.json() as {
			snapshot: {
				game: { devMode: boolean };
				metadata: SessionSnapshotMetadata;
			};
			registries: SessionRegistriesPayload;
		};
		expect(body.snapshot.game.devMode).toBe(true);
		expect(body.snapshot.metadata.triggers).toBeDefined();
		expect(body.snapshot.metadata.stats).toBeDefined();
		expect(body.snapshot.metadata.overview).toBeDefined();
		expect(body.registries.resources).toBeDefined();
		await app.close();
	});

	it('retrieves snapshots for sessions', async () => {
		const { app } = await createServer();
		const createResponse = await app.inject({
			method: 'POST',
			url: '/sessions',
			headers: authorizedHeaders,
			payload: {},
		});
		const { sessionId } = createResponse.json() as { sessionId: string };
		const snapshotResponse = await app.inject({
			method: 'GET',
			url: `/sessions/${sessionId}/snapshot`,
			headers: authorizedHeaders,
		});
		expect(snapshotResponse.statusCode).toBe(200);
		const snapshot = snapshotResponse.json() as {
			snapshot: {
				game: { players: unknown[] };
				metadata: SessionSnapshotMetadata;
			};
			registries: SessionRegistriesPayload;
		};
		expect(snapshot.snapshot.game.players).toHaveLength(2);
		expect(snapshot.snapshot.metadata.triggers).toBeDefined();
		expect(snapshot.snapshot.metadata.stats).toBeDefined();
		expect(snapshot.snapshot.metadata.overview).toBeDefined();
		expect(snapshot.registries.resources).toBeDefined();
		await app.close();
	});

	it('advances sessions through the API', async () => {
		const { app } = await createServer();
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
		const advanceBody = advanceResponse.json() as {
			snapshot: {
				game: { currentPhase: string };
				metadata: SessionSnapshotMetadata;
			};
			registries: SessionRegistriesPayload;
		};
		expect(advanceBody.snapshot.game.currentPhase).toBe('end');
		expect(advanceBody.snapshot.metadata.triggers).toBeDefined();
		expect(advanceBody.snapshot.metadata.stats).toBeDefined();
		expect(advanceBody.snapshot.metadata.overview).toBeDefined();
		expect(advanceBody.registries.resources).toBeDefined();
		await app.close();
	});

	it('toggles developer mode through the API', async () => {
		const { app } = await createServer();
		const createResponse = await app.inject({
			method: 'POST',
			url: '/sessions',
			headers: authorizedHeaders,
			payload: {},
		});
		const { sessionId, snapshot: createdSnapshot } = createResponse.json() as {
			sessionId: string;
			snapshot: {
				game: { devMode: boolean };
				metadata: SessionSnapshotMetadata;
			};
			registries: SessionRegistriesPayload;
		};
		expect(createdSnapshot.game.devMode).toBe(false);
		const devModeResponse = await app.inject({
			method: 'POST',
			url: `/sessions/${sessionId}/dev-mode`,
			headers: authorizedHeaders,
			payload: { enabled: true },
		});
		expect(devModeResponse.statusCode).toBe(200);
		const devModeBody = devModeResponse.json() as {
			snapshot: {
				game: { devMode: boolean };
				metadata: SessionSnapshotMetadata;
			};
			registries: SessionRegistriesPayload;
		};
		expect(devModeBody.snapshot.game.devMode).toBe(true);
		expect(devModeBody.snapshot.metadata.triggers).toBeDefined();
		expect(devModeBody.snapshot.metadata.stats).toBeDefined();
		expect(devModeBody.snapshot.metadata.overview).toBeDefined();
		expect(devModeBody.registries.resources).toBeDefined();
		await app.close();
	});

	it('updates player names through the API', async () => {
		const { app } = await createServer();
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
		const body = updateResponse.json() as {
			snapshot: {
				game: { players: Array<{ name: string }> };
				metadata: SessionSnapshotMetadata;
			};
			registries: SessionRegistriesPayload;
		};
		expect(body.snapshot.game.players[0]?.name).toBe('Captain');
		expect(body.snapshot.metadata.triggers).toBeDefined();
		expect(body.snapshot.metadata.stats).toBeDefined();
		expect(body.snapshot.metadata.overview).toBeDefined();
		expect(body.registries.resources).toBeDefined();
		await app.close();
	});

	it('executes actions and returns success payloads', async () => {
		const { app, actionId, gainKey } = await createServer();
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
		const actionBody = actionResponse.json() as {
			status: string;
			snapshot: {
				game: { players: Array<{ resources: Record<string, number> }> };
				metadata: SessionSnapshotMetadata;
			};
		};
		expect(actionBody.status).toBe('success');
		const [player] = actionBody.snapshot.game.players;
		expect(player?.resources[gainKey]).toBe(1);
		expect(actionBody.snapshot.metadata.triggers).toBeDefined();
		expect(actionBody.snapshot.metadata.stats).toBeDefined();
		expect(actionBody.snapshot.metadata.overview).toBeDefined();
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
		const { app } = await createServer();
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
		const runSpy = vi.spyOn(session, 'runAiTurn').mockResolvedValue(true);
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
		const body = response.json() as {
			sessionId: string;
			ranTurn: boolean;
			snapshot: SnapshotResponse['snapshot'];
			registries: RegistriesResponse['registries'];
		};
		expect(body.sessionId).toBe(sessionId);
		expect(body.ranTurn).toBe(true);
		expect(body.snapshot.game.currentPhase).toBeDefined();
		expect(Array.isArray(body.snapshot.recentResourceGains)).toBe(true);
		expect(body.snapshot.metadata.passiveEvaluationModifiers).toBeDefined();
		expect(body.snapshot.metadata.triggers).toBeDefined();
		expect(body.snapshot.metadata.stats).toBeDefined();
		expect(body.snapshot.metadata.overview).toBeDefined();
		expect(body.registries.actions).toBeDefined();
		expect(body.registries.resources).toBeDefined();
		expect(runSpy).toHaveBeenCalledWith(playerId);
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
		if (simulateSpy) {
			expect(simulateSpy).toHaveBeenCalledWith(playerId, {
				maxIterations: 2,
			});
		}
		await app.close();
	});

	it('returns 401 when authorization headers are missing', async () => {
		const { app } = await createServer();
		const response = await app.inject({
			method: 'POST',
			url: '/sessions',
			payload: {},
		});
		expect(response.statusCode).toBe(401);
		const body = response.json() as { code: string };
		expect(body.code).toBe('UNAUTHORIZED');
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
		const { app } = await createServer();
		const response = await app.inject({
			method: 'POST',
			url: '/sessions',
			headers: {
				authorization: ['Bearer session-manager', 'Bearer invalid-token'],
			},
			payload: {},
		});
		expect(response.statusCode).toBe(403);
		await app.close();
	});
});
