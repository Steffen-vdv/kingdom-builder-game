import { describe, it, expect } from 'vitest';
import {
	FastifySessionTransport,
	TransportErrorPayload,
} from '../src/transport/FastifySessionTransport.js';
import { SessionTransport } from '../src/transport/SessionTransport.js';
import { createSyntheticSessionManager } from './helpers/createSyntheticSessionManager.js';

function parseJson<T>(body: string): T {
	return JSON.parse(body) as T;
}

describe('FastifySessionTransport', () => {
	it('maps HTTP endpoints to session transport operations', async () => {
                const { manager, actionId } = createSyntheticSessionManager();
		const sessionTransport = new SessionTransport({
			sessionManager: manager,
		});
		const fastify = new FastifySessionTransport({
			sessionTransport,
			logger: false,
		});

		const createResponse = await fastify.instance.inject({
			method: 'POST',
			url: '/sessions',
			payload: { devMode: true },
		});
		expect(createResponse.statusCode).toBe(201);
		const created = parseJson<{ sessionId: string }>(createResponse.body);

		const snapshotResponse = await fastify.instance.inject({
			method: 'GET',
			url: `/sessions/${created.sessionId}/snapshot`,
		});
		expect(snapshotResponse.statusCode).toBe(200);
		const snapshot = parseJson<{ sessionId: string }>(snapshotResponse.body);
		expect(snapshot.sessionId).toBe(created.sessionId);

		const advanceResponse = await fastify.instance.inject({
			method: 'POST',
			url: `/sessions/${created.sessionId}/advance`,
		});
		expect(advanceResponse.statusCode).toBe(200);

		const actionResponse = await fastify.instance.inject({
			method: 'POST',
			url: `/sessions/${created.sessionId}/actions`,
			payload: { actionId },
		});
		expect(actionResponse.statusCode).toBe(200);
		const action = parseJson<{ status: string }>(actionResponse.body);
		expect(action.status).toBe('success');

		const secondActionResponse = await fastify.instance.inject({
			method: 'POST',
			url: `/sessions/${created.sessionId}/actions`,
			payload: { actionId },
		});
		expect(secondActionResponse.statusCode).toBe(400);
		const secondAction = parseJson<{ status: string }>(
			secondActionResponse.body,
		);
		expect(secondAction.status).toBe('error');

		await fastify.stop();
	});

	it('returns protocol error payloads for invalid sessions', async () => {
                const { manager, actionId } = createSyntheticSessionManager();
		const sessionTransport = new SessionTransport({
			sessionManager: manager,
		});
		const fastify = new FastifySessionTransport({
			sessionTransport,
			logger: false,
		});
		const createResponse = await fastify.instance.inject({
			method: 'POST',
			url: '/sessions',
			payload: {},
		});
		expect(createResponse.statusCode).toBe(201);
		const created = parseJson<{ sessionId: string }>(createResponse.body);

		const missingSnapshot = await fastify.instance.inject({
			method: 'GET',
			url: '/sessions/missing/snapshot',
		});
		expect(missingSnapshot.statusCode).toBe(404);
		const missingPayload = parseJson<TransportErrorPayload>(
			missingSnapshot.body,
		);
		expect(missingPayload.code).toBe('NOT_FOUND');

                const invalidAction = await fastify.instance.inject({
                        method: 'POST',
                        url: '/sessions/missing/actions',
                        payload: { actionId },
                });
		expect(invalidAction.statusCode).toBe(404);
		const invalidPayload = parseJson<TransportErrorPayload>(invalidAction.body);
		expect(invalidPayload.code).toBe('NOT_FOUND');

		const malformedAction = await fastify.instance.inject({
			method: 'POST',
			url: `/sessions/${created.sessionId}/actions`,
			payload: {},
		});
		expect(malformedAction.statusCode).toBe(400);
		const malformedPayload = parseJson<TransportErrorPayload>(
			malformedAction.body,
		);
		expect(malformedPayload.code).toBe('INVALID_REQUEST');

		await fastify.stop();
	});
});
