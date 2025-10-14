/** @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAiRunner } from '../../src/state/useAiRunner';
import {
	createSessionCreateResponse,
	createSessionSnapshot,
	createSnapshotPlayer,
} from '../helpers/sessionFixtures';
import {
	createResourceKeys,
	createSessionRegistriesPayload,
} from '../helpers/sessionRegistries';
import { createRemoteSessionAdapter } from '../helpers/createRemoteSessionAdapter';
import {
	clearSessionStateStore,
	initializeSessionState,
} from '../../src/state/sessionStateStore';

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
		const activePlayer = createSnapshotPlayer({
			id: 'player-1',
			aiControlled: true,
		});
		const opponent = createSnapshotPlayer({ id: 'player-2' });
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
		const fatalError = new Error('failed to reach action phase');
		const runUntilActionPhaseCore = vi
			.fn<[], Promise<void>>()
			.mockRejectedValueOnce(fatalError);
		const onFatalSessionError = vi.fn();
		const runAiTurn = vi.fn(() => Promise.resolve(true));
		const registries = createSessionRegistriesPayload();
		const sessionId = 'session-ai:runner-success';
		initializeSessionState(
			createSessionCreateResponse({
				sessionId,
				snapshot: sessionState,
				registries,
			}),
		);
		const session = createRemoteSessionAdapter({
			sessionId,
			runAiTurn: async (request) => ({
				sessionId: request.sessionId,
				snapshot: sessionState,
				registries,
				ranTurn: await runAiTurn(),
			}),
		});
		const syncPhaseState = vi.fn();
		const mountedRef = { current: true };

		renderHook(() =>
			useAiRunner({
				session,
				sessionState,
				runUntilActionPhaseCore,
				syncPhaseState,
				mountedRef,
				onFatalSessionError,
			}),
		);

		await act(async () => {
			await Promise.resolve();
		});

		expect(runAiTurn).toHaveBeenCalledTimes(1);
		expect(syncPhaseState).toHaveBeenCalledWith(sessionState, {
			isAdvancing: true,
			canEndTurn: false,
		});
		expect(runUntilActionPhaseCore).toHaveBeenCalledTimes(1);
		expect(onFatalSessionError).toHaveBeenCalledTimes(1);
		expect(onFatalSessionError).toHaveBeenCalledWith(fatalError);
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
		const activePlayer = createSnapshotPlayer({
			id: 'player-1',
			aiControlled: true,
		});
		const opponent = createSnapshotPlayer({ id: 'player-2' });
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
		const fatalError = new Error('fatal AI failure');
		const onFatalSessionError = vi.fn();
		const runAiTurn = vi.fn(() => Promise.reject(fatalError));
		const registries = createSessionRegistriesPayload();
		const sessionId = 'session-ai:runner-failure';
		initializeSessionState(
			createSessionCreateResponse({
				sessionId,
				snapshot: sessionState,
				registries,
			}),
		);
		const session = createRemoteSessionAdapter({
			sessionId,
			runAiTurn: async (request) => ({
				sessionId: request.sessionId,
				snapshot: sessionState,
				registries,
				ranTurn: await runAiTurn(),
			}),
		});
		const syncPhaseState = vi.fn();
		const mountedRef = { current: true };

		renderHook(() =>
			useAiRunner({
				session,
				sessionState,
				runUntilActionPhaseCore: vi.fn(),
				syncPhaseState,
				mountedRef,
				onFatalSessionError,
			}),
		);

		await act(async () => {
			await Promise.resolve();
		});

		expect(runAiTurn).toHaveBeenCalledTimes(1);
		expect(onFatalSessionError).toHaveBeenCalledWith(fatalError);
		expect(syncPhaseState).not.toHaveBeenCalled();
	});
});
