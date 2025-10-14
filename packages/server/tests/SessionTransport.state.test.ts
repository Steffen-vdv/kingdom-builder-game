import { describe, it, expect } from 'vitest';
import { SessionTransport } from '../src/transport/SessionTransport.js';
import { TransportError } from '../src/transport/TransportTypes.js';
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

describe('SessionTransport session state', () => {
	it('returns session state snapshots', () => {
		const { manager, actionId, costKey, gainKey } =
			createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			idFactory: expect.getState().currentTestName
				? () => 'state-session'
				: undefined,
			authMiddleware: middleware,
		});
		const { sessionId } = transport.createSession({
			body: {},
			headers: authorizedHeaders,
		});
		const state = transport.getSessionState({
			body: { sessionId },
			headers: authorizedHeaders,
		});
		expect(state.sessionId).toBe(sessionId);
		expect(state.snapshot.game.players).toHaveLength(2);
		expect(state.registries.actions[actionId]).toBeDefined();
		expect(state.registries.resources[costKey]).toMatchObject({ key: costKey });
		expect(state.registries.resources[gainKey]).toMatchObject({ key: gainKey });
	});

	it('throws when a session cannot be located', () => {
		const { manager } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			idFactory: expect.getState().currentTestName
				? () => 'missing-session'
				: undefined,
			authMiddleware: middleware,
		});
		const expectNotFound = () =>
			transport.getSessionState({
				body: { sessionId: 'missing' },
				headers: authorizedHeaders,
			});
		expect(expectNotFound).toThrow(TransportError);
		try {
			expectNotFound();
		} catch (error) {
			if (error instanceof TransportError) {
				expect(error.code).toBe('NOT_FOUND');
			}
		}
	});

	it('validates session identifiers before fetching state', () => {
		const { manager } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
		});
		const attempt = () =>
			transport.getSessionState({
				body: {},
			});
		expect(attempt).toThrow(TransportError);
		try {
			attempt();
		} catch (error) {
			if (error instanceof TransportError) {
				expect(error.code).toBe('INVALID_REQUEST');
			}
		}
	});
});

describe('SessionTransport session metadata', () => {
	it('merges static metadata into snapshots without mutating the cache', () => {
		const { manager } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			idFactory: expect.getState().currentTestName
				? () => 'metadata-session'
				: undefined,
			authMiddleware: middleware,
		});
		const baselineMetadata = manager.getMetadata();
		const { sessionId } = transport.createSession({
			body: {},
			headers: authorizedHeaders,
		});
		const state = transport.getSessionState({
			body: { sessionId },
			headers: authorizedHeaders,
		});
		const { metadata } = state.snapshot;
		expect(metadata.passiveEvaluationModifiers).toBeDefined();
		const resourceKeys = metadata.resources
			? Object.keys(metadata.resources)
			: [];
		expect(resourceKeys.length).toBeGreaterThan(0);
		expect(metadata.triggers).toBeDefined();
		const triggerKeys = metadata.triggers ? Object.keys(metadata.triggers) : [];
		expect(triggerKeys.length).toBeGreaterThan(0);
		expect(metadata.overview?.hero).toBeDefined();
		if (resourceKeys.length > 0 && metadata.resources) {
			const key = resourceKeys[0];
			const entry = metadata.resources[key];
			if (entry) {
				entry.label = 'mutated';
			}
		}
		const refreshedMetadata = manager.getMetadata();
		expect(refreshedMetadata).toEqual(baselineMetadata);
	});
});
