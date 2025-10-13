import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useSessionQueue } from '../../src/state/useSessionQueue';
import {
	clearSessionStateStore,
	initializeSessionState,
} from '../../src/state/sessionStateStore';
import type {
	SessionAdapter,
	SessionQueueHelpers,
	SessionSnapshot,
} from '../../src/state/sessionTypes';
import type { SessionCreateResponse } from '@kingdom-builder/protocol/session';
import { createSessionRegistriesPayload } from '../helpers/sessionRegistries';
import {
	createSessionSnapshot,
	createSnapshotPlayer,
} from '../helpers/sessionFixtures';

const createBaseSnapshot = (): SessionSnapshot =>
	createSessionSnapshot({
		players: [
			createSnapshotPlayer({ id: 'A', name: 'Alpha' }),
			createSnapshotPlayer({ id: 'B', name: 'Bravo' }),
		],
		activePlayerId: 'A',
		opponentId: 'B',
		phases: [
			{
				id: 'phase:start',
				action: true,
				steps: [{ id: 'phase:start:step' }],
			},
		],
		actionCostResource: 'gold',
		ruleSnapshot: {
			tieredResourceKey: 'gold',
			tierDefinitions: [],
			winConditions: [],
		},
	}) as unknown as SessionSnapshot;

describe('useSessionQueue', () => {
	beforeEach(() => {
		clearSessionStateStore();
	});

	const createHelpers = ({
		adapter,
		sessionId,
		latestSnapshot,
	}: {
		adapter: SessionAdapter;
		sessionId: string;
		latestSnapshot: SessionSnapshot | null;
	}): SessionQueueHelpers => ({
		enqueue: (task) => Promise.resolve().then(task),
		getSessionAdapter: () => adapter,
		getSessionId: () => sessionId,
		getLatestSnapshot: () => latestSnapshot,
	});

	it('returns the session adapter supplied by the queue helpers', () => {
		const sessionId = 'session:test-adapter';
		const adapter = { tag: 'adapter' } as SessionAdapter;
		const helpers = createHelpers({
			adapter,
			sessionId,
			latestSnapshot: null,
		});
		const snapshot = createBaseSnapshot();
		const { result } = renderHook(() => useSessionQueue(helpers, snapshot));
		expect(result.current.sessionAdapter).toBe(adapter);
	});

	it('prefers the latest snapshot exposed by the queue helpers', () => {
		const sessionId = 'session:test-latest';
		const adapter = { tag: 'adapter' } as SessionAdapter;
		const snapshot = createBaseSnapshot();
		const helpers = createHelpers({
			adapter,
			sessionId,
			latestSnapshot: {
				...snapshot,
				game: { ...snapshot.game, turn: snapshot.game.turn + 1 },
			},
		});
		const { result } = renderHook(() => useSessionQueue(helpers, snapshot));
		expect(result.current.cachedSessionSnapshot.game.turn).toBe(
			snapshot.game.turn + 1,
		);
	});

	it('falls back to the cached snapshot stored in the session state store', () => {
		const sessionId = 'session:test-store';
		const adapter = { tag: 'adapter' } as SessionAdapter;
		const snapshot = createBaseSnapshot();
		const response: SessionCreateResponse = {
			sessionId,
			snapshot,
			registries: createSessionRegistriesPayload(),
		};
		initializeSessionState(response);
		const helpers = createHelpers({
			adapter,
			sessionId,
			latestSnapshot: null,
		});
		const { result } = renderHook(() => useSessionQueue(helpers, snapshot));
		expect(result.current.cachedSessionSnapshot).toEqual(snapshot);
	});

	it('uses the provided session snapshot when no cached state exists', () => {
		const sessionId = 'session:test-fallback';
		const adapter = { tag: 'adapter' } as SessionAdapter;
		const snapshot = createBaseSnapshot();
		const helpers = createHelpers({
			adapter,
			sessionId,
			latestSnapshot: null,
		});
		const { result } = renderHook(() => useSessionQueue(helpers, snapshot));
		expect(result.current.cachedSessionSnapshot).toBe(snapshot);
	});
});
