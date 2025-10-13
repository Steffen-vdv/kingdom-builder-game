import fastify from 'fastify';
import { describe, it, expect } from 'vitest';
import { createTokenAuthMiddleware } from '../src/auth/tokenAuthMiddleware.js';
import {
	createSessionTransportPlugin,
	type FastifySessionTransportOptions,
} from '../src/transport/FastifySessionTransport.js';
import { createSyntheticSessionManager } from './helpers/createSyntheticSessionManager.js';

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

	async function createServer(tokens = defaultTokens) {
		const { manager, actionId, gainKey, costKey } =
			createSyntheticSessionManager();
		const app = fastify();
		const options: FastifySessionTransportOptions = {
			sessionManager: manager,
			authMiddleware: createTokenAuthMiddleware({ tokens }),
		};
		await app.register(createSessionTransportPlugin, options);
		await app.ready();
		return { app, actionId, gainKey, costKey };
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
			snapshot: { game: { devMode: boolean } };
		};
		expect(body.snapshot.game.devMode).toBe(true);
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
			snapshot: { game: { players: unknown[] } };
		};
		expect(snapshot.snapshot.game.players).toHaveLength(2);
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
			snapshot: { game: { currentPhase: string } };
		};
		expect(advanceBody.snapshot.game.currentPhase).toBe('end');
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
			snapshot: { game: { devMode: boolean } };
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
			snapshot: { game: { devMode: boolean } };
		};
		expect(devModeBody.snapshot.game.devMode).toBe(true);
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
			snapshot: { game: { players: Array<{ name: string }> } };
		};
		expect(body.snapshot.game.players[0]?.name).toBe('Captain');
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
			};
		};
		expect(actionBody.status).toBe('success');
		const [player] = actionBody.snapshot.game.players;
		expect(player?.resources[gainKey]).toBe(1);
		await app.close();
	});

	it('returns action costs through the API', async () => {
		const { app, actionId, costKey } = await createServer();
		const createResponse = await app.inject({
			method: 'POST',
			url: '/sessions',
			headers: authorizedHeaders,
			payload: {},
		});
		const { sessionId } = createResponse.json() as { sessionId: string };
		const costsResponse = await app.inject({
			method: 'POST',
			url: `/sessions/${sessionId}/actions/${actionId}/costs`,
			headers: authorizedHeaders,
			payload: {},
		});
		expect(costsResponse.statusCode).toBe(200);
		const body = costsResponse.json() as {
			sessionId: string;
			costs: Record<string, number>;
		};
		expect(body.sessionId).toBe(sessionId);
		expect(body.costs[costKey]).toBe(1);
		await app.close();
	});

	it('returns action requirements through the API', async () => {
		const { app, actionId } = await createServer();
		const createResponse = await app.inject({
			method: 'POST',
			url: '/sessions',
			headers: authorizedHeaders,
			payload: {},
		});
		const { sessionId } = createResponse.json() as { sessionId: string };
		const requirementResponse = await app.inject({
			method: 'POST',
			url: `/sessions/${sessionId}/actions/${actionId}/requirements`,
			headers: authorizedHeaders,
			payload: {},
		});
		expect(requirementResponse.statusCode).toBe(200);
		const body = requirementResponse.json() as { requirements: unknown[] };
		expect(Array.isArray(body.requirements)).toBe(true);
		await app.close();
	});

	it('returns action options through the API', async () => {
		const { app, actionId } = await createServer();
		const createResponse = await app.inject({
			method: 'POST',
			url: '/sessions',
			headers: authorizedHeaders,
			payload: {},
		});
		const { sessionId } = createResponse.json() as { sessionId: string };
		const optionsResponse = await app.inject({
			method: 'GET',
			url: `/sessions/${sessionId}/actions/${actionId}/options`,
			headers: authorizedHeaders,
		});
		expect(optionsResponse.statusCode).toBe(200);
		const body = optionsResponse.json() as { groups: unknown[] };
		expect(Array.isArray(body.groups)).toBe(true);
		await app.close();
	});

	it('returns 404 for missing action metadata requests', async () => {
		const { app } = await createServer();
		const createResponse = await app.inject({
			method: 'POST',
			url: '/sessions',
			headers: authorizedHeaders,
			payload: {},
		});
		const { sessionId } = createResponse.json() as { sessionId: string };
		const response = await app.inject({
			method: 'POST',
			url: `/sessions/${sessionId}/actions/missing-action/costs`,
			headers: authorizedHeaders,
			payload: {},
		});
		expect(response.statusCode).toBe(404);
		const body = response.json() as { code: string };
		expect(body.code).toBe('NOT_FOUND');
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

	it('runs AI controllers through the API', async () => {
		const { app } = await createServer();
		const createResponse = await app.inject({
			method: 'POST',
			url: '/sessions',
			headers: authorizedHeaders,
			payload: {},
		});
		const { sessionId } = createResponse.json() as { sessionId: string };
		const aiResponse = await app.inject({
			method: 'POST',
			url: `/sessions/${sessionId}/ai-turn`,
			headers: authorizedHeaders,
			payload: { playerId: 'B' },
		});
		expect(aiResponse.statusCode).toBe(200);
		const body = aiResponse.json() as {
			ranTurn: boolean;
			registries: Record<string, unknown>;
		};
		expect(typeof body.ranTurn).toBe('boolean');
		expect(body.registries.actions).toBeDefined();
		await app.close();
	});

	it('returns 404 when the AI controller is missing', async () => {
		const { app } = await createServer();
		const createResponse = await app.inject({
			method: 'POST',
			url: '/sessions',
			headers: authorizedHeaders,
			payload: {},
		});
		const { sessionId } = createResponse.json() as { sessionId: string };
		const aiResponse = await app.inject({
			method: 'POST',
			url: `/sessions/${sessionId}/ai-turn`,
			headers: authorizedHeaders,
			payload: { playerId: 'A' },
		});
		expect(aiResponse.statusCode).toBe(404);
		const body = aiResponse.json() as { code: string };
		expect(body.code).toBe('NOT_FOUND');
		await app.close();
	});

	it('simulates upcoming phases over HTTP', async () => {
		const { app } = await createServer();
		const createResponse = await app.inject({
			method: 'POST',
			url: '/sessions',
			headers: authorizedHeaders,
			payload: {},
		});
		const { sessionId } = createResponse.json() as { sessionId: string };
		const simulateResponse = await app.inject({
			method: 'POST',
			url: `/sessions/${sessionId}/simulate`,
			headers: authorizedHeaders,
			payload: {
				playerId: 'A',
				options: { phaseIds: { growth: 'main', upkeep: 'end' } },
			},
		});
		expect(simulateResponse.statusCode).toBe(200);
		const body = simulateResponse.json() as { result: { playerId: string } };
		expect(body.result.playerId).toBe('A');
		await app.close();
	});

	it('validates simulation requests over HTTP', async () => {
		const { app } = await createServer();
		const createResponse = await app.inject({
			method: 'POST',
			url: '/sessions',
			headers: authorizedHeaders,
			payload: {},
		});
		const { sessionId } = createResponse.json() as { sessionId: string };
		const simulateResponse = await app.inject({
			method: 'POST',
			url: `/sessions/${sessionId}/simulate`,
			headers: authorizedHeaders,
			payload: {},
		});
		expect(simulateResponse.statusCode).toBe(400);
		const body = simulateResponse.json() as { code: string };
		expect(body.code).toBe('INVALID_REQUEST');
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
		const body = response.json() as { status: string; error: string };
		expect(body.status).toBe('error');
		expect(body.error).toContain('was not found');
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
