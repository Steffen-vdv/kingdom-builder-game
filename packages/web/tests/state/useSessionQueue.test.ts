/** @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionSnapshot } from '@kingdom-builder/protocol/session';
import { useSessionQueue } from '../../src/state/useSessionQueue';
import type { SessionQueueHelpers } from '../../src/state/sessionTypes';
import {
	clearSessionStateStore,
	initializeSessionState,
	updateSessionSnapshot,
} from '../../src/state/sessionStateStore';
import { createRemoteSessionAdapter } from '../helpers/createRemoteSessionAdapter';
import { createSessionRegistriesPayload } from '../helpers/sessionRegistries';
import {
	createSessionCreateResponse,
	createSessionSnapshot,
	createSnapshotPlayer,
} from '../helpers/sessionFixtures';

const createTestSnapshot = (): SessionSnapshot => {
	const phases = [
		{
			id: 'phase:test',
			action: true,
			steps: [{ id: 'phase:test:start' }],
		},
	];
	const playerA = createSnapshotPlayer({ id: 'A' });
	const playerB = createSnapshotPlayer({ id: 'B' });
	return createSessionSnapshot({
		players: [playerA, playerB],
		activePlayerId: playerA.id,
		opponentId: playerB.id,
		phases,
		actionCostResource: 'resource:test',
		ruleSnapshot: {
			tieredResourceKey: 'resource:test',
			tierDefinitions: [],
			winConditions: [],
		},
	});
};

describe('useSessionQueue', () => {
	const sessionId = 'session:queue';

	beforeEach(() => {
		clearSessionStateStore();
	});

	it('delegates enqueue to the session state store queue seed', async () => {
		const snapshot = createTestSnapshot();
		const registries = createSessionRegistriesPayload();
		initializeSessionState(
			createSessionCreateResponse({
				sessionId,
				snapshot,
				registries,
			}),
		);
		const adapter = createRemoteSessionAdapter({ sessionId });
		const enqueueMock = vi.fn(() => {
			throw new Error('queue helper enqueue should not be used');
		});
		const queueHelpers: SessionQueueHelpers = {
			enqueue: enqueueMock,
			getCurrentSession: () => adapter,
			getLatestSnapshot: () => null,
		};
		const { result } = renderHook(() =>
			useSessionQueue(queueHelpers, snapshot, sessionId),
		);
		const task = vi.fn(() => 'complete');
		let value: string | undefined;
		await act(async () => {
			value = await result.current.enqueue(task);
		});
		expect(value).toBe('complete');
		expect(task).toHaveBeenCalledTimes(1);
		expect(enqueueMock).not.toHaveBeenCalled();
	});

	it('returns the cached snapshot stored in the session state store', () => {
		const snapshot = createTestSnapshot();
		const registries = createSessionRegistriesPayload();
		initializeSessionState(
			createSessionCreateResponse({
				sessionId,
				snapshot,
				registries,
			}),
		);
		const adapter = createRemoteSessionAdapter({ sessionId });
		const queueHelpers: SessionQueueHelpers = {
			enqueue: vi.fn(async <T>(task: () => Promise<T> | T) => await task()),
			getCurrentSession: () => adapter,
			getLatestSnapshot: () => null,
		};
		const { result, rerender } = renderHook(
			({ currentSnapshot }) =>
				useSessionQueue(queueHelpers, currentSnapshot, sessionId),
			{ initialProps: { currentSnapshot: snapshot } },
		);
		const updated = createTestSnapshot();
		updateSessionSnapshot(sessionId, updated);
		rerender({ currentSnapshot: snapshot });
		expect(result.current.cachedSessionSnapshot).toEqual(updated);
	});
});
