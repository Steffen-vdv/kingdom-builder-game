import { describe, it, expect, vi } from 'vitest';
import type { SessionSnapshotMetadata } from '@kingdom-builder/protocol';
import {
	SessionTransport,
	PLAYER_NAME_MAX_LENGTH,
} from '../src/transport/SessionTransport.js';
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

describe('SessionTransport createSession', () => {
	it('creates sessions and applies player preferences', () => {
		const { manager } = createSyntheticSessionManager();
		const idFactory = vi.fn().mockReturnValue('transport-session');
		const transport = new SessionTransport({
			sessionManager: manager,
			idFactory,
			authMiddleware: middleware,
		});
		const response = transport.createSession({
			body: {
				devMode: true,
				playerNames: { A: 'Alpha', B: 'Beta' },
			},
			headers: authorizedHeaders,
		});
		expect(response.sessionId).toBe('transport-session');
		expectSnapshotMetadata(response.snapshot.metadata);
		expectDescriptorMetadata(response.snapshot.metadata);
		expect(response.snapshot.game.devMode).toBe(true);
		expectStaticMetadata(manager.getMetadata());
		const [playerA, playerB] = response.snapshot.game.players;
		expect(playerA?.name).toBe('Alpha');
		expect(playerB?.name).toBe('Beta');
	});

	it('skips blank player name entries when applying preferences', () => {
		const { manager } = createSyntheticSessionManager();
		const originalCreate = manager.createSession.bind(manager);
		let updateSpy: ReturnType<typeof vi.spyOn>;
		vi.spyOn(manager, 'createSession').mockImplementation(
			(sessionId, options) => {
				const session = originalCreate(sessionId, options);
				updateSpy = vi.spyOn(session, 'updatePlayerName');
				return session;
			},
		);
		const transport = new SessionTransport({
			sessionManager: manager,
			idFactory: vi.fn().mockReturnValue('naming-session'),
			authMiddleware: middleware,
		});
		const response = transport.createSession({
			body: { playerNames: { A: '   ', B: 'Bravo' } },
			headers: authorizedHeaders,
		});
		manager.createSession.mockRestore();
		expectStaticMetadata(manager.getMetadata());
		expect(updateSpy).toBeDefined();
		expect(updateSpy?.mock.calls).toHaveLength(1);
		expect(updateSpy?.mock.calls[0]).toEqual(['B', 'Bravo']);
		expectSnapshotMetadata(response.snapshot.metadata);
		const [playerA, playerB] = response.snapshot.game.players;
		expect(playerA?.name).not.toBe('   ');
		expect(playerB?.name).toBe('Bravo');
	});

	it('stores trimmed player names in the session snapshot', () => {
		const { manager } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			idFactory: vi.fn().mockReturnValue('trim-session'),
			authMiddleware: middleware,
		});
		const response = transport.createSession({
			body: { playerNames: { A: '  Charlie  ' } },
			headers: authorizedHeaders,
		});
		expectSnapshotMetadata(response.snapshot.metadata);
		expectStaticMetadata(manager.getMetadata());
		const [playerA] = response.snapshot.game.players;
		expect(playerA?.name).toBe('Charlie');
	});

	it('accepts player names at the maximum allowed length', () => {
		const { manager } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			idFactory: vi.fn().mockReturnValue('length-session'),
			authMiddleware: middleware,
		});
		const maxLengthName = 'N'.repeat(PLAYER_NAME_MAX_LENGTH);
		const response = transport.createSession({
			body: { playerNames: { A: maxLengthName } },
			headers: authorizedHeaders,
		});
		expectSnapshotMetadata(response.snapshot.metadata);
		expectStaticMetadata(manager.getMetadata());
		const [playerA] = response.snapshot.game.players;
		expect(playerA?.name).toBe(maxLengthName);
	});

	it('rejects player names that exceed the maximum length before creating sessions', () => {
		const { manager } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			idFactory: vi.fn().mockReturnValue('too-long'),
			authMiddleware: middleware,
		});
		const createSpy = vi.spyOn(manager, 'createSession');
		const overLengthName = 'X'.repeat(PLAYER_NAME_MAX_LENGTH + 1);
		let thrown: unknown;
		try {
			transport.createSession({
				body: { playerNames: { A: overLengthName } },
				headers: authorizedHeaders,
			});
		} catch (error) {
			thrown = error;
		}
		expect(thrown).toBeInstanceOf(TransportError);
		if (thrown instanceof TransportError) {
			expect(thrown.code).toBe('INVALID_REQUEST');
		}
		expect(createSpy).not.toHaveBeenCalled();
		createSpy.mockRestore();
	});

	it('fails when unique session identifiers cannot be generated', () => {
		const { manager } = createSyntheticSessionManager();
		manager.createSession('collision');
		const idFactory = vi.fn().mockReturnValue('collision');
		const transport = new SessionTransport({
			sessionManager: manager,
			idFactory,
			authMiddleware: middleware,
		});
		let thrown: unknown;
		try {
			transport.createSession({
				body: {},
				headers: authorizedHeaders,
			});
		} catch (error) {
			thrown = error;
		}
		expect(thrown).toBeInstanceOf(TransportError);
		if (thrown instanceof TransportError) {
			expect(thrown.code).toBe('CONFLICT');
		}
		expect(idFactory).toHaveBeenCalledTimes(10);
	});

	it('includes base registries in session responses', () => {
		const { manager, factory, costKey, gainKey, actionId } =
			createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			idFactory: vi.fn().mockReturnValue('registry-session'),
			authMiddleware: middleware,
		});
		const response = transport.createSession({
			body: {},
			headers: authorizedHeaders,
		});
		const { registries } = response;
		expectSnapshotMetadata(response.snapshot.metadata);
		expect(new Set(Object.keys(registries.actions))).toEqual(
			new Set(factory.actions.keys()),
		);
		expect(new Set(Object.keys(registries.buildings))).toEqual(
			new Set(factory.buildings.keys()),
		);
		expect(new Set(Object.keys(registries.developments))).toEqual(
			new Set(factory.developments.keys()),
		);
		expect(new Set(Object.keys(registries.populations))).toEqual(
			new Set(factory.populations.keys()),
		);
		expect(registries.actions[actionId]).toMatchObject({ id: actionId });
		expect(registries.resources[costKey]).toMatchObject({ key: costKey });
		expect(registries.resources[gainKey]).toMatchObject({ key: gainKey });
	});
});
