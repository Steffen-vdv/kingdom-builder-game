import { describe, it, expect } from 'vitest';
import type { SessionSnapshotMetadata } from '@kingdom-builder/protocol';
import { SessionTransport } from '../src/transport/SessionTransport.js';
import { TransportError } from '../src/transport/TransportTypes.js';
import { createTokenAuthMiddleware } from '../src/auth/tokenAuthMiddleware.js';
import { createSyntheticSessionManager } from './helpers/createSyntheticSessionManager.js';
import {
	expectSnapshotMetadata,
	expectStaticMetadata,
} from './helpers/expectSnapshotMetadata.js';

function expectDescriptorMetadata(
	metadata: SessionSnapshotMetadata | undefined,
): void {
	expect(metadata).toBeDefined();
	if (!metadata) {
		return;
	}
	expect(Object.keys(metadata.stats ?? {})).not.toHaveLength(0);
	expect(Object.keys(metadata.triggers ?? {})).not.toHaveLength(0);
	expect(metadata.overview).toBeDefined();
}

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
		expectSnapshotMetadata(state.snapshot.metadata);
		expectDescriptorMetadata(state.snapshot.metadata);
		expect(state.registries.actions[actionId]).toBeDefined();
		expectStaticMetadata(manager.getMetadata());
		expect(state.registries.resources[costKey]).toMatchObject({
			key: costKey,
		});
		expect(state.registries.resources[gainKey]).toMatchObject({
			key: gainKey,
		});
		expect(Array.isArray(state.registries.resourceDefinitions)).toBe(true);
		expect(Array.isArray(state.registries.resourceGroups)).toBe(true);
		const [playerSnapshot] = state.snapshot.game.players;
		expect(playerSnapshot?.values).toBeDefined();
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
