/** @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useAiRunner } from '../../src/state/useAiRunner';
import {
	createSessionSnapshot,
	createSnapshotPlayer,
} from '../helpers/sessionFixtures';
import { createResourceKeys } from '../helpers/sessionRegistries';
import * as SessionSdk from '../../src/state/sessionSdk';

function createTestSessionState(activePlayerFirst: boolean) {
	const [actionCostResource] = createResourceKeys();
	if (!actionCostResource) {
		throw new Error('RESOURCE_KEYS is empty');
	}
	const phases = [
		{
			id: 'phase-main',
			name: 'Main Phase',
			action: true,
			steps: [],
		},
	];
	const primary = createSnapshotPlayer({ id: 'player-1' });
	const opponent = createSnapshotPlayer({ id: 'player-2' });
	const players = activePlayerFirst ? [primary, opponent] : [primary, opponent];
	const activePlayerId = activePlayerFirst ? primary.id : opponent.id;
	const opponentId = activePlayerFirst ? opponent.id : primary.id;
	return createSessionSnapshot({
		players,
		activePlayerId,
		opponentId,
		phases,
		actionCostResource,
		ruleSnapshot: {
			tieredResourceKey: actionCostResource,
			tierDefinitions: [],
			winConditions: [],
		},
		currentPhase: phases[0]?.id,
		currentStep: phases[0]?.id,
		phaseIndex: 0,
	});
}

describe('useAiRunner', () => {
	it('queues the phase runner when the opponent is active', async () => {
		const sessionState = createTestSessionState(false);
		const runUntilActionPhaseCore = vi
			.fn<[], Promise<void>>()
			.mockResolvedValue();
		const enqueue = vi
			.fn(<T>(task: () => Promise<T> | T) => Promise.resolve(task()))
			.mockImplementation(async (task) => Promise.resolve(task()));
		const getLatestSnapshot = vi.fn(() => sessionState);
		const mountedRef = { current: true };

		renderHook(() =>
			useAiRunner({
				sessionId: 'session-1',
				sessionState,
				runUntilActionPhaseCore,
				enqueue,
				getLatestSnapshot,
				mountedRef,
			}),
		);

		await act(async () => {
			await Promise.resolve();
		});

		expect(enqueue).toHaveBeenCalledTimes(1);
		expect(runUntilActionPhaseCore).toHaveBeenCalledTimes(1);
	});

	it('does nothing when the local player is active', async () => {
		const sessionState = createTestSessionState(true);
		const runUntilActionPhaseCore = vi
			.fn<[], Promise<void>>()
			.mockResolvedValue();
		const enqueue = vi.fn(<T>(task: () => Promise<T> | T) =>
			Promise.resolve(task()),
		);
		const getLatestSnapshot = vi.fn(() => sessionState);
		const mountedRef = { current: true };

		renderHook(() =>
			useAiRunner({
				sessionId: 'session-1',
				sessionState,
				runUntilActionPhaseCore,
				enqueue,
				getLatestSnapshot,
				mountedRef,
			}),
		);

		await act(async () => {
			await Promise.resolve();
		});

		expect(enqueue).not.toHaveBeenCalled();
		expect(runUntilActionPhaseCore).not.toHaveBeenCalled();
	});

	it('marks fatal errors when the queue fails', async () => {
		const sessionState = createTestSessionState(false);
		const fatalError = new Error('queue failure');
		const runUntilActionPhaseCore = vi
			.fn<[], Promise<void>>()
			.mockResolvedValue();
		const enqueue = vi.fn(() => Promise.reject(fatalError));
		const getLatestSnapshot = vi.fn(() => sessionState);
		const mountedRef = { current: true };
		const onFatalSessionError = vi.fn();
		const markSpy = vi.spyOn(SessionSdk, 'markFatalSessionError');

		renderHook(() =>
			useAiRunner({
				sessionId: 'session-1',
				sessionState,
				runUntilActionPhaseCore,
				enqueue,
				getLatestSnapshot,
				mountedRef,
				onFatalSessionError,
			}),
		);

		await act(async () => {
			await Promise.resolve();
		});

		expect(enqueue).toHaveBeenCalledTimes(1);
		expect(runUntilActionPhaseCore).not.toHaveBeenCalled();
		expect(onFatalSessionError).toHaveBeenCalledWith(fatalError);
		expect(markSpy).toHaveBeenCalledWith(fatalError);
	});
});
