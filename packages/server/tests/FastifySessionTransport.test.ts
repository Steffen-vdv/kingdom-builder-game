import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import {
	actionExecuteResponseSchema,
	sessionAdvanceResponseSchema,
	sessionCreateResponseSchema,
} from '@kingdom-builder/protocol';
import { createTokenAuthMiddleware } from '../src/auth/tokenAuthMiddleware.js';
import { SessionManager } from '../src/session/SessionManager.js';
import { createFastifySessionTransport } from '../src/transport/FastifySessionTransport.js';
import { createSyntheticSessionManager } from './helpers/createSyntheticSessionManager.js';

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
};

describe('FastifySessionTransport', () => {
	let server: FastifyInstance;
	let actionId: string;
	let sessionId: string;
	let gainKey: string;

	beforeEach(async () => {
		const synthetic = createSyntheticSessionManager();
		gainKey = synthetic.gainKey;
		const [fallbackAction] = synthetic.factory.actions.keys();
		if (!fallbackAction) {
			throw new Error('Synthetic fallback action was not registered.');
		}
		const manager = new SessionManager({
			engineOptions: {
				actions: synthetic.factory.actions,
				buildings: synthetic.factory.buildings,
				developments: synthetic.factory.developments,
				populations: synthetic.factory.populations,
				phases: synthetic.phases,
				start: {
					...synthetic.start,
					player: {
						...synthetic.start.player,
						actions: [fallbackAction],
					},
				},
				rules: synthetic.rules,
			},
		});
		server = await createFastifySessionTransport({
			sessionManager: manager,
			authMiddleware: middleware,
		});
		const response = await server.inject({
			method: 'POST',
			url: '/sessions',
			headers: authorizedHeaders,
			payload: { devMode: true },
		});
		const body = sessionCreateResponseSchema.parse(response.json());
		sessionId = body.sessionId;
		const [player] = body.snapshot.game.players;
		actionId = player?.actions[0] ?? fallbackAction;
		if (!actionId) {
			throw new Error('Synthetic test action was not registered.');
		}
	});

	afterEach(async () => {
		await server.close();
	});

	it('creates sessions via HTTP transport', async () => {
		const response = await server.inject({
			method: 'POST',
			url: '/sessions',
			headers: authorizedHeaders,
			payload: { devMode: true },
		});
		expect(response.statusCode).toBe(201);
		const body = sessionCreateResponseSchema.parse(response.json());
		expect(body.snapshot.game.devMode).toBe(true);
	});

	it('provides session snapshots', async () => {
		const response = await server.inject({
			method: 'GET',
			url: `/sessions/${sessionId}/snapshot`,
			headers: authorizedHeaders,
		});
		expect(response.statusCode).toBe(200);
		const body = sessionCreateResponseSchema.parse(response.json());
		expect(body.sessionId).toBe(sessionId);
	});

	it('reports action execution errors via protocol payloads', async () => {
		const response = await server.inject({
			method: 'POST',
			url: `/sessions/${sessionId}/actions`,
			headers: authorizedHeaders,
			payload: { actionId },
		});
		expect(response.statusCode).toBe(200);
		const body = actionExecuteResponseSchema.parse(response.json());
		expect(body.status).toBe('error');
		if (body.status === 'error') {
			expect(body.error).toContain('Insufficient ap');
		}
	});

	it('returns protocol errors for invalid sessions', async () => {
		const response = await server.inject({
			method: 'POST',
			url: `/sessions/unknown/actions`,
			headers: authorizedHeaders,
			payload: { actionId },
		});
		const body = actionExecuteResponseSchema.parse(response.json());
		expect(body.status).toBe('error');
		if (body.status === 'error') {
			expect(body.error).toContain('not found');
		}
	});

	it('reports validation errors using protocol payloads', async () => {
		const response = await server.inject({
			method: 'POST',
			url: `/sessions/${sessionId}/actions`,
			headers: authorizedHeaders,
			payload: {},
		});
		const body = actionExecuteResponseSchema.parse(response.json());
		expect(body.status).toBe('error');
	});

	it('advances sessions via queued operations', async () => {
		const response = await server.inject({
			method: 'POST',
			url: `/sessions/${sessionId}/advance`,
			headers: authorizedHeaders,
		});
		expect(response.statusCode).toBe(200);
		const body = sessionAdvanceResponseSchema.parse(response.json());
		expect(body.advance.phase).toBe('main');
		expect(body.snapshot.game.currentPhase).toBe('end');
	});

	it('rejects unauthorized access to protected endpoints', async () => {
		const response = await server.inject({
			method: 'POST',
			url: '/sessions',
			payload: {},
		});
		expect(response.statusCode).toBe(401);
		const body = response.json();
		expect(body.error).toBe('UNAUTHORIZED');
	});
});
