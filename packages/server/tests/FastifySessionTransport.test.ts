import fastify from 'fastify';
import { describe, it, expect, vi } from 'vitest';
import { createTokenAuthMiddleware } from '../src/auth/tokenAuthMiddleware.js';
import {
	createSessionTransportPlugin,
	type FastifySessionTransportOptions,
} from '../src/transport/FastifySessionTransport.js';
import {
	TransportError,
	type TransportErrorCode,
} from '../src/transport/TransportTypes.js';
import { createSyntheticSessionManager } from './helpers/createSyntheticSessionManager.js';

describe('FastifySessionTransport', () => {
	const middleware = createTokenAuthMiddleware({
		tokens: {
			'session-manager': {
				userId: 'manager',
				roles: ['session:create', 'session:advance', 'admin'],
			},
		},
	});

	const authorizedHeaders = {
		authorization: 'Bearer session-manager',
	};

	async function createServer(
		overrides: Partial<FastifySessionTransportOptions> = {},
	) {
		const { manager, actionId, gainKey } = createSyntheticSessionManager();
		const app = fastify();
		const options: FastifySessionTransportOptions = {
			sessionManager: overrides.sessionManager ?? manager,
			authMiddleware: overrides.authMiddleware ?? middleware,
			idFactory: overrides.idFactory,
		};
		await app.register(createSessionTransportPlugin, options);
		await app.ready();
		return {
			app,
			actionId,
			gainKey,
			manager: options.sessionManager,
		};
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
		const body = response.json() as { status: string; error: string };
		expect(body.status).toBe('error');
		expect(body.error).toContain('was not found');
		await app.close();
	});

	it('normalizes header arrays for authentication', async () => {
		const { app } = await createServer();
		const response = await app.inject({
			method: 'POST',
			url: '/sessions',
			headers: {
				authorization: 'Bearer session-manager',
				'x-extra': ['first', 'second'],
			},
			payload: {},
		});
		expect(response.statusCode).toBe(201);
		await app.close();
	});

	it('returns unauthorized responses without credentials', async () => {
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

	it('maps forbidden errors to HTTP 403 status codes', async () => {
		const limited = createTokenAuthMiddleware({
			tokens: {
				'creator-only': {
					userId: 'creator',
					roles: ['session:create'],
				},
			},
		});
		const { app } = await createServer({ authMiddleware: limited });
		const createResponse = await app.inject({
			method: 'POST',
			url: '/sessions',
			headers: { authorization: 'Bearer creator-only' },
			payload: {},
		});
		const { sessionId } = createResponse.json() as {
			sessionId: string;
		};
		const advance = await app.inject({
			method: 'POST',
			url: `/sessions/${sessionId}/advance`,
			headers: { authorization: 'Bearer creator-only' },
			payload: {},
		});
		expect(advance.statusCode).toBe(403);
		const body = advance.json() as { code: string };
		expect(body.code).toBe('FORBIDDEN');
		await app.close();
	});

	it('propagates conflict errors when identifiers collide', async () => {
		const { app } = await createServer({
			idFactory: () => 'fixed-session',
		});
		const first = await app.inject({
			method: 'POST',
			url: '/sessions',
			headers: authorizedHeaders,
			payload: {},
		});
		expect(first.statusCode).toBe(201);
		const second = await app.inject({
			method: 'POST',
			url: '/sessions',
			headers: authorizedHeaders,
			payload: {},
		});
		expect(second.statusCode).toBe(409);
		const body = second.json() as { code: string };
		expect(body.code).toBe('CONFLICT');
		await app.close();
	});

	it('rethrows unexpected transport errors to Fastify', async () => {
		const failingManager = {
			createSession: vi.fn(() => ({
				setDevMode: vi.fn(),
			})),
			getSession: vi.fn().mockReturnValue(undefined),
			getSnapshot: vi.fn(() => {
				throw new Error('boom');
			}),
		} as unknown as FastifySessionTransportOptions['sessionManager'];
		const { app } = await createServer({
			sessionManager: failingManager,
		});
		const response = await app.inject({
			method: 'POST',
			url: '/sessions',
			headers: authorizedHeaders,
			payload: {},
		});
		expect(response.statusCode).toBe(500);
		await app.close();
	});

	it('returns protocol errors when payloads are non-object bodies', async () => {
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
			url: `/sessions/${sessionId}/actions`,
			headers: {
				...authorizedHeaders,
				'content-type': 'text/plain',
			},
			payload: 'invalid-body',
		});
		expect(response.statusCode).toBe(400);
		const body = response.json() as { status: string };
		expect(body.status).toBe('error');
		await app.close();
	});

	it('maps unknown transport error codes to HTTP 500 responses', async () => {
		const unknownError = new TransportError(
			'UNHANDLED' as TransportErrorCode,
			'Unhandled',
		);
		const failingManager = {
			createSession: vi.fn(() => ({
				setDevMode: vi.fn(),
			})),
			getSession: vi.fn().mockReturnValue(undefined),
			getSnapshot: vi.fn(() => {
				throw unknownError;
			}),
		} as unknown as FastifySessionTransportOptions['sessionManager'];
		const { app } = await createServer({
			sessionManager: failingManager,
		});
		const response = await app.inject({
			method: 'POST',
			url: '/sessions',
			headers: authorizedHeaders,
			payload: {},
		});
		expect(response.statusCode).toBe(500);
		const body = response.json() as { code: string };
		expect(body.code).toBe('UNHANDLED');
		await app.close();
	});
});
