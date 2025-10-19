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
	createSessionRegistries,
	createSessionRegistriesPayload,
} from '../helpers/sessionRegistries';
import {
	clearSessionStateStore,
	getSessionSnapshot,
	initializeSessionState,
	updateSessionSnapshot,
} from '../../src/state/sessionStateStore';
import * as sessionAiModule from '../../src/state/sessionAi';

describe('useAiRunner', () => {
	beforeEach(() => {
		clearSessionStateStore();
	});

	it('forwards fatal errors from the action phase runner', async () => {
		const resourceKeys = createResourceKeys();
		const [actionCostResource] = resourceKeys;
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
		const registriesPayload = createSessionRegistriesPayload();
		const registries = createSessionRegistries();
		const sessionId = 'session-ai';
		initializeSessionState({
			sessionId,
			snapshot: sessionState,
			registries: registriesPayload,
		});
		const fatalError = new Error('failed to reach action phase');
		const runUntilActionPhaseCore = vi
			.fn<[], Promise<void>>()
			.mockRejectedValueOnce(fatalError);
		const onFatalSessionError = vi.fn();
		const syncPhaseState = vi.fn();
		const mountedRef = { current: true };
		const showResolution = vi.fn().mockResolvedValue(undefined);
		const addLog = vi.fn();
		const runAiTurnSpy = vi
			.spyOn(sessionAiModule, 'runAiTurn')
			.mockResolvedValueOnce(true);

		renderHook(() =>
			useAiRunner({
				sessionId,
				sessionSnapshot: sessionState,
				runUntilActionPhaseCore,
				syncPhaseState,
				mountedRef,
				registries,
				resourceKeys,
				showResolution,
				addLog,
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
		runAiTurnSpy.mockRestore();
	});

	it('stops background turns when the AI run reports a fatal error', async () => {
		const resourceKeys = createResourceKeys();
		const [actionCostResource] = resourceKeys;
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
		const registriesPayload = createSessionRegistriesPayload();
		const registries = createSessionRegistries();
		const sessionId = 'session-ai';
		initializeSessionState({
			sessionId,
			snapshot: sessionState,
			registries: registriesPayload,
		});
		const fatalError = new Error('fatal AI failure');
		const onFatalSessionError = vi.fn();
		const runAiTurnSpy = vi
			.spyOn(sessionAiModule, 'runAiTurn')
			.mockRejectedValueOnce(fatalError);
		const syncPhaseState = vi.fn();
		const mountedRef = { current: true };
		const showResolution = vi.fn().mockResolvedValue(undefined);
		const addLog = vi.fn();

		renderHook(() =>
			useAiRunner({
				sessionId,
				sessionSnapshot: sessionState,
				runUntilActionPhaseCore: vi.fn(),
				syncPhaseState,
				mountedRef,
				registries,
				resourceKeys,
				showResolution,
				addLog,
				onFatalSessionError,
			}),
		);

		await act(async () => {
			await Promise.resolve();
		});

		expect(onFatalSessionError).toHaveBeenCalledWith(fatalError);
		expect(syncPhaseState).not.toHaveBeenCalled();
		runAiTurnSpy.mockRestore();
	});

	it('shows each AI action before advancing the turn', async () => {
		const resourceKeys = createResourceKeys();
		const [actionCostResource] = resourceKeys;
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
			id: 'A',
			aiControlled: true,
			resources: { [actionCostResource]: 2 },
			actions: ['tax'],
		});
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
			metadata: { passiveEvaluationModifiers: {} },
		});
		const registriesPayload = createSessionRegistriesPayload();
		const registries = createSessionRegistries();
		const sessionId = 'session-ai';
		initializeSessionState({
			sessionId,
			snapshot: sessionState,
			registries: registriesPayload,
		});
		const runUntilActionPhaseCore = vi.fn().mockResolvedValue(undefined);
		const syncPhaseState = vi.fn();
		const mountedRef = { current: true };
		const showResolution = vi.fn().mockResolvedValue(undefined);
		const addLog = vi.fn();
		let calls = 0;
		const runAiTurnSpy = vi
			.spyOn(sessionAiModule, 'runAiTurn')
			.mockImplementation(() => {
				calls += 1;
				const snapshot = getSessionSnapshot(sessionId);
				const next = { ...snapshot };
				const modifiers = snapshot.metadata?.passiveEvaluationModifiers ?? {};
				if (calls === 1) {
					const player = next.game.players.find(
						(entry) => entry.id === activePlayer.id,
					);
					if (player) {
						player.resources[actionCostResource] = 1;
					}
					next.metadata = {
						passiveEvaluationModifiers: modifiers,
						effectLogs: {
							'ai:action': [
								{
									actionId: 'tax',
									playerId: activePlayer.id,
									traces: [],
								},
							],
						},
					};
				} else {
					next.metadata = { passiveEvaluationModifiers: modifiers };
					next.phases = [
						{
							...next.phases[0],
							action: false,
						},
					];
				}
				updateSessionSnapshot(sessionId, next);
				return Promise.resolve(true);
			});

		renderHook(() =>
			useAiRunner({
				sessionId,
				sessionSnapshot: sessionState,
				runUntilActionPhaseCore,
				syncPhaseState,
				mountedRef,
				registries,
				resourceKeys,
				showResolution,
				addLog,
			}),
		);

		await act(async () => {
			await Promise.resolve();
			await Promise.resolve();
		});

		expect(showResolution).toHaveBeenCalledTimes(1);
		expect(runAiTurnSpy).toHaveBeenCalledTimes(2);
		expect(runUntilActionPhaseCore).toHaveBeenCalledTimes(1);
		runAiTurnSpy.mockRestore();
	});
});
