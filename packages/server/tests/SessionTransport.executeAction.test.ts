import { describe, it, expect, vi } from 'vitest';
import type { SessionRequirementFailure } from '@kingdom-builder/protocol';
import { SessionTransport } from '../src/transport/SessionTransport.js';
import { createTokenAuthMiddleware } from '../src/auth/tokenAuthMiddleware.js';
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
} satisfies Record<string, string>;

describe('SessionTransport executeAction', () => {
	it('executes actions and returns updated snapshots', async () => {
		const { manager, gainKey, actionId } = createSyntheticSessionManager();
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
		const expectedRawCosts = session?.getActionCosts(actionId) ?? {};
		const expectedCosts: Record<string, number> = {};
		for (const [resourceKey, amount] of Object.entries(expectedRawCosts)) {
			if (typeof amount === 'number') {
				expectedCosts[resourceKey] = amount;
			}
		}
		const result = await transport.executeAction({
			body: { sessionId, actionId },
			headers: authorizedHeaders,
		});
		expect(result.status).toBe('success');
		const [player] = result.snapshot.game.players;
		expect(player?.resources[gainKey]).toBe(1);
		expect(Array.isArray(result.traces)).toBe(true);
		expect(result.costs).toEqual(expectedCosts);
		expect(result.httpStatus).toBe(200);
	});

	it('returns conflict responses when actions fail without requirement details', async () => {
		const { manager, actionId } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: middleware,
		});
		const { sessionId } = transport.createSession({
			body: {},
			headers: authorizedHeaders,
		});
		const session = manager.getSession(sessionId);
		const rejection = new Error('Action failure');
		if (session) {
			vi.spyOn(session, 'enqueue').mockImplementation(() =>
				Promise.reject(rejection),
			);
		}
		const result = await transport.executeAction({
			body: { sessionId, actionId, params: {} },
			headers: authorizedHeaders,
		});
		expect(result.status).toBe('error');
		expect(result.requirementFailure).toBeUndefined();
		expect(result.requirementFailures).toBeUndefined();
		expect(result.httpStatus).toBe(409);
	});

	it('returns requirement failures when action execution is rejected', async () => {
		const { manager, actionId } = createSyntheticSessionManager();
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
		const failure: SessionRequirementFailure = {
			requirement: {
				type: 'synthetic',
				method: 'deny',
				params: { flag: true },
			},
			message: 'Denied',
		};
		const rejection = new Error('Action execution failed.');
		(
			rejection as { requirementFailure?: SessionRequirementFailure }
		).requirementFailure = failure;
		if (session) {
			vi.spyOn(session, 'enqueue').mockImplementation(() =>
				Promise.reject(rejection),
			);
		}
		const result = await transport.executeAction({
			body: { sessionId, actionId, params: {} },
			headers: authorizedHeaders,
		});
		expect(result.status).toBe('error');
		expect(result.requirementFailure).toEqual(failure);
		expect(result.requirementFailures).toEqual([failure]);
		expect(result.httpStatus).toBe(409);
	});

	it('returns protocol errors for invalid action payloads', async () => {
		const { manager } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: middleware,
		});
		const { sessionId } = transport.createSession({
			body: {},
			headers: authorizedHeaders,
		});
		const result = await transport.executeAction({
			body: { sessionId },
			headers: authorizedHeaders,
		});
		expect(result.status).toBe('error');
		expect(result.error).toBe('Invalid action request.');
		expect(result.httpStatus).toBe(400);
	});

	it('reports missing sessions when executing actions', async () => {
		const { manager, actionId } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: middleware,
		});
		const result = await transport.executeAction({
			body: { sessionId: 'unknown', actionId },
			headers: authorizedHeaders,
		});
		expect(result.status).toBe('error');
		expect(result.error).toContain('was not found');
		expect(result.httpStatus).toBe(404);
	});
});
