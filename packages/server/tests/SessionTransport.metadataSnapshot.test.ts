import { describe, it, expect } from 'vitest';
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

describe('SessionTransport metadata snapshots', () => {
	it('returns global metadata when no session id is provided', () => {
		const { manager } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: middleware,
		});
		const snapshot = transport.getMetadataSnapshot();
		expect(snapshot.metadata).toEqual(manager.getMetadata());
		expect(snapshot.registries).toEqual(manager.getRegistries());
	});

	it('returns session metadata when a session id is provided', () => {
		const { manager } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: middleware,
		});
		const { sessionId } = transport.createSession({
			body: {},
			headers: authorizedHeaders,
		});
		const snapshot = transport.getMetadataSnapshot(sessionId);
		expect(snapshot.metadata).toEqual(manager.getSessionMetadata(sessionId));
		expect(snapshot.registries).toEqual(
			manager.getSessionRegistries(sessionId),
		);
	});
});
