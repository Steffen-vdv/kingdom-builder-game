import { describe, it, expect } from 'vitest';
import { SessionTransport } from '../src/transport/SessionTransport.js';
import { TransportError } from '../src/transport/TransportTypes.js';
import { createTokenAuthMiddleware } from '../src/auth/tokenAuthMiddleware.js';
import { createSyntheticSessionManager } from './helpers/createSyntheticSessionManager.js';
import {
	expectSnapshotMetadata,
	expectStaticMetadata,
} from './helpers/expectSnapshotMetadata.js';

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

describe('SessionTransport dev mode', () => {
	it('toggles developer mode on demand', async () => {
		const { manager, actionId } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			idFactory: expect.getState().currentTestName
				? () => 'dev-session'
				: undefined,
			authMiddleware: middleware,
		});
		const { sessionId } = await transport.createSession({
			body: { devMode: false },
			headers: authorizedHeaders,
		});
		const updated = await transport.setDevMode({
			body: { sessionId, enabled: true },
			headers: authorizedHeaders,
		});
		expect(updated.snapshot.game.devMode).toBe(true);
		expectSnapshotMetadata(updated.snapshot.metadata);
		expect(updated.registries.actions[actionId]).toBeDefined();
		expectStaticMetadata(manager.getMetadata());
	});

	it('validates dev mode toggles before applying them', async () => {
		const { manager } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: middleware,
		});
		await expect(
			transport.setDevMode({
				headers: authorizedHeaders,
				body: { sessionId: 123 },
			}),
		).rejects.toThrow(TransportError);
		try {
			await transport.setDevMode({
				headers: authorizedHeaders,
				body: { sessionId: 123 },
			});
		} catch (error) {
			if (error instanceof TransportError) {
				expect(error.code).toBe('INVALID_REQUEST');
			}
		}
	});
});
