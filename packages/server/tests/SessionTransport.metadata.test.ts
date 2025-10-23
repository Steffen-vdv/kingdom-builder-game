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

describe('SessionTransport getMetadataSnapshot', () => {
	it('returns global registries and metadata when no session is provided', () => {
		const { manager } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: middleware,
		});
		const response = transport.getMetadataSnapshot();
		expect(response.metadata).toEqual(manager.getMetadata());
		expect(response.registries).toEqual(manager.getRegistries());
	});

	it('returns session scoped registries and metadata when a session id is provided', () => {
		const { manager } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: middleware,
		});
		const { sessionId } = transport.createSession({
			body: {},
			headers: authorizedHeaders,
		});
		const response = transport.getMetadataSnapshot(sessionId);
		expect(response.metadata).toEqual(manager.getSessionMetadata(sessionId));
		expect(response.registries).toEqual(
			manager.getSessionRegistries(sessionId),
		);
	});
});
