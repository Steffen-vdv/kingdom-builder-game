/** @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const sessionAiMocks = vi.hoisted(() => ({
	hasAiController: vi.fn(),
	runAiTurn: vi.fn(),
	enqueueSessionTask: vi.fn(),
}));

vi.mock('../../src/state/sessionAi', () => ({
	hasAiController: sessionAiMocks.hasAiController,
	runAiTurn: sessionAiMocks.runAiTurn,
	enqueueSessionTask: sessionAiMocks.enqueueSessionTask,
}));

import { useAiRunner } from '../../src/state/useAiRunner';
import {
	createSessionSnapshot,
	createSnapshotPlayer,
} from '../helpers/sessionFixtures';
import { createResourceKeys } from '../helpers/sessionRegistries';
import { clearSessionStateStore } from '../../src/state/sessionStateStore';
import * as sessionStateStoreModule from '../../src/state/sessionStateStore';

describe('useAiRunner', () => {
	beforeEach(() => {
		clearSessionStateStore();
		sessionAiMocks.hasAiController.mockReset();
		sessionAiMocks.runAiTurn.mockReset();
		sessionAiMocks.enqueueSessionTask.mockReset();
	});

	it('forwards fatal errors from the action phase runner', async () => {
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
		const activePlayer = createSnapshotPlayer({ id: 'A', aiControlled: true });
		const opponent = createSnapshotPlayer({ id: 'B' });
		const sessionState = createSessionSnapshot({
			players: [activePlayer, opponent],
			activePlayerId: activePlayer.id,
			opponentId: opponent.id,
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
		sessionAiMocks.hasAiController.mockReturnValue(true);
		sessionAiMocks.runAiTurn.mockResolvedValue(true);
		sessionAiMocks.enqueueSessionTask.mockImplementation(
			async <T>(sessionId: string, task: () => Promise<T> | T) => {
				void sessionId;
				return await task();
			},
		);
		const getSnapshotSpy = vi
			.spyOn(sessionStateStoreModule, 'getSessionSnapshot')
			.mockReturnValue(sessionState);
		const fatalError = new Error('failed to reach action phase');
		const runUntilActionPhaseCore = vi
			.fn<[], Promise<void>>()
			.mockRejectedValueOnce(fatalError);
		const onFatalSessionError = vi.fn();
		const syncPhaseState = vi.fn();
		const mountedRef = { current: true };

		renderHook(() =>
			useAiRunner({
				sessionId: 'session-ai',
				sessionSnapshot: sessionState,
				runUntilActionPhaseCore,
				syncPhaseState,
				mountedRef,
				onFatalSessionError,
			}),
		);

		await act(async () => {
			await Promise.resolve();
		});

		expect(syncPhaseState).toHaveBeenCalledWith(sessionState, {
			isAdvancing: true,
			canEndTurn: false,
		});
		expect(runUntilActionPhaseCore).toHaveBeenCalledTimes(1);
		expect(onFatalSessionError).toHaveBeenCalledTimes(1);
		expect(onFatalSessionError).toHaveBeenCalledWith(fatalError);
		expect(sessionAiMocks.runAiTurn).toHaveBeenCalledWith(
			'session-ai',
			activePlayer.id,
		);
		getSnapshotSpy.mockRestore();
	});

	it('stops background turns when the AI run reports a fatal error', async () => {
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
		const activePlayer = createSnapshotPlayer({ id: 'A', aiControlled: true });
		const opponent = createSnapshotPlayer({ id: 'B' });
		const sessionState = createSessionSnapshot({
			players: [activePlayer, opponent],
			activePlayerId: activePlayer.id,
			opponentId: opponent.id,
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
		sessionAiMocks.hasAiController.mockReturnValue(true);
		const fatalError = new Error('fatal AI failure');
		const onFatalSessionError = vi.fn();
		sessionAiMocks.runAiTurn.mockRejectedValueOnce(fatalError);
		sessionAiMocks.enqueueSessionTask.mockResolvedValue(undefined);
		const getSnapshotSpy = vi
			.spyOn(sessionStateStoreModule, 'getSessionSnapshot')
			.mockReturnValue(sessionState);
		const syncPhaseState = vi.fn();
		const mountedRef = { current: true };

		renderHook(() =>
			useAiRunner({
				sessionId: 'session-ai',
				sessionSnapshot: sessionState,
				runUntilActionPhaseCore: vi.fn(),
				syncPhaseState,
				mountedRef,
				onFatalSessionError,
			}),
		);

		await act(async () => {
			await Promise.resolve();
		});

		expect(onFatalSessionError).toHaveBeenCalledWith(fatalError);
		expect(syncPhaseState).not.toHaveBeenCalled();
		getSnapshotSpy.mockRestore();
	});
});
