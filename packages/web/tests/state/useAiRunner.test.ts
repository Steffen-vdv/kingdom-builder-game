/** @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAiRunner } from '../../src/state/useAiRunner';
import {
	createSessionSnapshot,
	createSnapshotPlayer,
} from '../helpers/sessionFixtures';
import {
	createResourceKeys,
	createSessionRegistriesPayload,
} from '../helpers/sessionRegistries';
import { createRemoteSessionAdapter } from '../helpers/remoteSessionAdapter';
import { clearSessionStateStore } from '../../src/state/sessionStateStore';

describe('useAiRunner', () => {
	beforeEach(() => {
		clearSessionStateStore();
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
		const registries = createSessionRegistriesPayload();
		const { adapter, api, cleanup } = createRemoteSessionAdapter({
			sessionId: 'session-ai',
			snapshot: sessionState,
			registries,
		});
		api.setNextRunAiResponse({
			sessionId: 'session-ai',
			snapshot: sessionState,
			registries,
			ranTurn: true,
		});
		const fatalError = new Error('failed to reach action phase');
		const runUntilActionPhaseCore = vi
			.fn<[], Promise<void>>()
			.mockRejectedValueOnce(fatalError);
		const onFatalSessionError = vi.fn();
		const syncPhaseState = vi.fn();
		const mountedRef = { current: true };

		renderHook(() =>
			useAiRunner({
				session: adapter,
				sessionState,
				runUntilActionPhaseCore,
				syncPhaseState,
				mountedRef,
				controlledPlayerId: opponent.id,
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
		cleanup();
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
		const registries = createSessionRegistriesPayload();
		const { adapter, cleanup } = createRemoteSessionAdapter({
			sessionId: 'session-ai',
			snapshot: sessionState,
			registries,
		});
		const fatalError = new Error('fatal AI failure');
		const onFatalSessionError = vi.fn();
		vi.spyOn(adapter, 'runAiTurn').mockRejectedValueOnce(fatalError);
		const syncPhaseState = vi.fn();
		const mountedRef = { current: true };

		renderHook(() =>
			useAiRunner({
				session: adapter,
				sessionState,
				runUntilActionPhaseCore: vi.fn(),
				syncPhaseState,
				mountedRef,
				controlledPlayerId: opponent.id,
				onFatalSessionError,
			}),
		);

		await act(async () => {
			await Promise.resolve();
		});

		expect(onFatalSessionError).toHaveBeenCalledWith(fatalError);
		expect(syncPhaseState).not.toHaveBeenCalled();
		cleanup();
	});

	it('runs AI turns when the active player is not controlled locally', async () => {
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
		const activePlayer = createSnapshotPlayer({ id: 'A' });
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
		const registries = createSessionRegistriesPayload();
		const { adapter, cleanup } = createRemoteSessionAdapter({
			sessionId: 'session-ai',
			snapshot: sessionState,
			registries,
		});
		const enqueueSpy = vi.spyOn(adapter, 'enqueue');
		const runSpy = vi.spyOn(adapter, 'runAiTurn');
		runSpy.mockResolvedValueOnce({
			sessionId: 'session-ai',
			snapshot: sessionState,
			registries,
			ranTurn: true,
		});
		const syncPhaseState = vi.fn();
		const mountedRef = { current: true };

		renderHook(() =>
			useAiRunner({
				session: adapter,
				sessionState,
				runUntilActionPhaseCore: vi.fn(),
				syncPhaseState,
				mountedRef,
				controlledPlayerId: opponent.id,
			}),
		);

		await act(async () => {
			await Promise.resolve();
		});

		expect(enqueueSpy).toHaveBeenCalled();
		expect(runSpy).toHaveBeenCalledWith(activePlayer.id);
		cleanup();
	});
});
