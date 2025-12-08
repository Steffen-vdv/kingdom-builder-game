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
import {
	clearSessionStateStore,
	initializeSessionState,
	updateSessionSnapshot,
} from '../../src/state/sessionStateStore';
import * as sessionAiModule from '../../src/state/sessionAi';
import type { RunUntilActionPhaseOptions } from '../../src/state/usePhaseProgress';

function createDeferred() {
	let resolve: () => void = () => {};
	const promise = new Promise<void>((res) => {
		resolve = res;
	});
	return { promise, resolve };
}

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
		const registriesPayload = createSessionRegistriesPayload();
		const sessionId = 'session-ai';
		const record = initializeSessionState({
			sessionId,
			snapshot: sessionState,
			registries: registriesPayload,
		});
		const fatalError = new Error('failed to reach action phase');
		const runUntilActionPhaseCore = vi
			.fn<[RunUntilActionPhaseOptions?], Promise<void>>()
			.mockRejectedValueOnce(fatalError);
		const onFatalSessionError = vi.fn();
		const syncPhaseState = vi.fn();
		const mountedRef = { current: true };
		const showResolution = vi.fn().mockResolvedValue(undefined);
		const addResolutionLog = vi.fn();
		const runAiTurnSpy = vi
			.spyOn(sessionAiModule, 'runAiTurn')
			.mockResolvedValueOnce({
				ranTurn: true,
				actions: [],
				phaseComplete: true,
				snapshot: record.snapshot,
				registries: record.registries,
			});

		renderHook(() =>
			useAiRunner({
				sessionId,
				sessionSnapshot: sessionState,
				runUntilActionPhaseCore,
				syncPhaseState,
				mountedRef,
				showResolution,
				addResolutionLog,
				registries: record.registries,
				resourceKeys: record.resourceKeys,
				actionCostResource,
				onFatalSessionError,
			}),
		);

		await act(async () => {
			await Promise.resolve();
		});

		expect(syncPhaseState).toHaveBeenNthCalledWith(1, record.snapshot);
		expect(syncPhaseState).toHaveBeenNthCalledWith(2, sessionState, {
			isAdvancing: true,
			canEndTurn: false,
		});
		expect(runUntilActionPhaseCore).toHaveBeenCalledTimes(1);
		expect(runUntilActionPhaseCore).toHaveBeenCalledWith(
			expect.objectContaining({ forceAdvance: true }),
		);
		expect(onFatalSessionError).toHaveBeenCalledWith(fatalError);
		runAiTurnSpy.mockRestore();
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
		const registriesPayload = createSessionRegistriesPayload();
		const sessionId = 'session-ai';
		const record = initializeSessionState({
			sessionId,
			snapshot: sessionState,
			registries: registriesPayload,
		});
		const fatalError = new Error('fatal AI failure');
		const onFatalSessionError = vi.fn();
		const showResolution = vi.fn().mockResolvedValue(undefined);
		const addResolutionLog = vi.fn();
		const runAiTurnSpy = vi
			.spyOn(sessionAiModule, 'runAiTurn')
			.mockRejectedValueOnce(fatalError);
		const syncPhaseState = vi.fn();
		const mountedRef = { current: true };

		renderHook(() =>
			useAiRunner({
				sessionId,
				sessionSnapshot: sessionState,
				runUntilActionPhaseCore: vi.fn<
					[RunUntilActionPhaseOptions?],
					Promise<void>
				>(),
				syncPhaseState,
				mountedRef,
				showResolution,
				addResolutionLog,
				registries: record.registries,
				resourceKeys: record.resourceKeys,
				actionCostResource,
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

	it('waits for each resolution before requesting the next AI action', async () => {
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
			id: 'A',
			aiControlled: true,
			resources: { [actionCostResource]: 2 },
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
		});
		const registriesPayload = createSessionRegistriesPayload();
		const sessionId = 'session-ai';
		const record = initializeSessionState({
			sessionId,
			snapshot: sessionState,
			registries: registriesPayload,
		});
		const resourceKeys = record.resourceKeys;
		const [actionId] = record.registries.actions.keys();
		if (!actionId) {
			throw new Error('No actions available');
		}
		const createTrace = (
			beforeResources: Record<string, number>,
			afterResources: Record<string, number>,
		) => ({
			id: actionId,
			before: {
				resources: { ...beforeResources },
				stats: { ...activePlayer.stats },
				buildings: [...activePlayer.buildings],
				lands: activePlayer.lands.map((land) => ({
					id: land.id,
					slotsMax: land.slotsMax,
					slotsUsed: land.slotsUsed,
					developments: [...land.developments],
				})),
				passives: [],
			},
			after: {
				resources: { ...afterResources },
				stats: { ...activePlayer.stats },
				buildings: [...activePlayer.buildings],
				lands: activePlayer.lands.map((land) => ({
					id: land.id,
					slotsMax: land.slotsMax,
					slotsUsed: land.slotsUsed,
					developments: [...land.developments],
				})),
				passives: [],
			},
		});
		const firstResources = {
			...activePlayer.values,
			[actionCostResource]: (activePlayer.values[actionCostResource] ?? 0) - 1,
		};
		const secondResources = {
			...firstResources,
			[actionCostResource]: (firstResources[actionCostResource] ?? 0) - 1,
		};
		const firstTrace = createTrace(activePlayer.values, firstResources);
		const secondTrace = createTrace(firstResources, secondResources);
		const firstSnapshot = {
			...sessionState,
			game: {
				...sessionState.game,
				players: sessionState.game.players.map((player) => {
					if (player.id !== activePlayer.id) {
						return player;
					}
					return {
						...player,
						values: firstResources,
					};
				}),
			},
		};
		const secondSnapshot = {
			...firstSnapshot,
			game: {
				...firstSnapshot.game,
				players: firstSnapshot.game.players.map((player) => {
					if (player.id !== activePlayer.id) {
						return player;
					}
					return {
						...player,
						values: secondResources,
					};
				}),
			},
		};
		const firstResolution = createDeferred();
		const secondResolution = createDeferred();
		const showResolution = vi
			.fn<[], Promise<void>>()
			.mockReturnValueOnce(firstResolution.promise)
			.mockReturnValueOnce(secondResolution.promise);
		const addResolutionLog = vi.fn();
		const runAiTurnSpy = vi
			.spyOn(sessionAiModule, 'runAiTurn')
			.mockImplementationOnce(() => {
				updateSessionSnapshot(sessionId, firstSnapshot);
				return Promise.resolve({
					ranTurn: true,
					actions: [
						{
							actionId,
							costs: { [actionCostResource]: 1 },
							traces: [firstTrace],
						},
					],
					phaseComplete: false,
					snapshot: firstSnapshot,
					registries: record.registries,
				});
			})
			.mockImplementationOnce(() => {
				updateSessionSnapshot(sessionId, secondSnapshot);
				return Promise.resolve({
					ranTurn: true,
					actions: [
						{
							actionId,
							costs: { [actionCostResource]: 1 },
							traces: [secondTrace],
						},
					],
					phaseComplete: true,
					snapshot: secondSnapshot,
					registries: record.registries,
				});
			})
			.mockResolvedValue({
				ranTurn: false,
				actions: [],
				phaseComplete: true,
				snapshot: secondSnapshot,
				registries: record.registries,
			});
		const syncPhaseState = vi.fn();
		const mountedRef = { current: true };
		const runUntilActionPhaseCore = vi
			.fn<[RunUntilActionPhaseOptions?], Promise<void>>()
			.mockResolvedValue(undefined);

		renderHook(() =>
			useAiRunner({
				sessionId,
				sessionSnapshot: sessionState,
				runUntilActionPhaseCore,
				syncPhaseState,
				mountedRef,
				showResolution,
				addResolutionLog,
				registries: record.registries,
				resourceKeys,
				actionCostResource,
			}),
		);

		await act(async () => {
			await Promise.resolve();
		});

		expect(runAiTurnSpy).toHaveBeenCalledTimes(1);
		expect(showResolution).toHaveBeenCalledTimes(1);

		await act(async () => {
			firstResolution.resolve();
			await Promise.resolve();
		});

		expect(runAiTurnSpy).toHaveBeenCalledTimes(2);
		expect(showResolution).toHaveBeenCalledTimes(2);

		await act(async () => {
			secondResolution.resolve();
			await Promise.resolve();
		});

		expect(runUntilActionPhaseCore).toHaveBeenCalledTimes(1);
		expect(runUntilActionPhaseCore).toHaveBeenCalledWith(
			expect.objectContaining({ forceAdvance: true }),
		);
		runAiTurnSpy.mockRestore();
	});

	it('forces phase advancement to hand control back to the player', async () => {
		const [actionCostResource] = createResourceKeys();
		if (!actionCostResource) {
			throw new Error('RESOURCE_KEYS is empty');
		}
		const phases = [
			{
				id: 'phase-ai',
				name: 'AI Action',
				action: true,
				steps: [],
			},
			{
				id: 'phase-player',
				name: 'Player Action',
				action: true,
				steps: [],
			},
		];
		const aiPlayer = createSnapshotPlayer({ id: 'AI', aiControlled: true });
		const humanPlayer = createSnapshotPlayer({ id: 'Human' });
		const sessionState = createSessionSnapshot({
			players: [aiPlayer, humanPlayer],
			activePlayerId: aiPlayer.id,
			opponentId: humanPlayer.id,
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
		const nextActionSnapshot = createSessionSnapshot({
			players: [aiPlayer, humanPlayer],
			activePlayerId: humanPlayer.id,
			opponentId: aiPlayer.id,
			phases,
			actionCostResource,
			ruleSnapshot: {
				tieredResourceKey: actionCostResource,
				tierDefinitions: [],
				winConditions: [],
			},
			currentPhase: phases[1]?.id,
			currentStep: phases[1]?.id,
			phaseIndex: 1,
		});
		const registriesPayload = createSessionRegistriesPayload();
		const sessionId = 'session-handoff';
		const record = initializeSessionState({
			sessionId,
			snapshot: sessionState,
			registries: registriesPayload,
		});
		const syncPhaseState = vi.fn();
		const runUntilActionPhaseCore = vi.fn<
			[RunUntilActionPhaseOptions?],
			Promise<void>
		>((options) => {
			expect(options?.forceAdvance).toBe(true);
			updateSessionSnapshot(sessionId, nextActionSnapshot);
			syncPhaseState(nextActionSnapshot, {
				isAdvancing: false,
			});
			return Promise.resolve();
		});
		const showResolution = vi.fn().mockResolvedValue(undefined);
		const addResolutionLog = vi.fn();
		const runAiTurnSpy = vi
			.spyOn(sessionAiModule, 'runAiTurn')
			.mockResolvedValueOnce({
				ranTurn: true,
				actions: [],
				phaseComplete: true,
				snapshot: record.snapshot,
				registries: record.registries,
			})
			.mockResolvedValue({
				ranTurn: false,
				actions: [],
				phaseComplete: true,
				snapshot: nextActionSnapshot,
				registries: record.registries,
			});
		const mountedRef = { current: true };

		renderHook(() =>
			useAiRunner({
				sessionId,
				sessionSnapshot: sessionState,
				runUntilActionPhaseCore,
				syncPhaseState,
				mountedRef,
				showResolution,
				addResolutionLog,
				registries: record.registries,
				resourceKeys: record.resourceKeys,
				actionCostResource,
			}),
		);

		await act(async () => {
			await Promise.resolve();
		});
		await act(async () => {
			await Promise.resolve();
			await Promise.resolve();
		});

		expect(runUntilActionPhaseCore).toHaveBeenCalledWith(
			expect.objectContaining({ forceAdvance: true }),
		);
		expect(syncPhaseState).toHaveBeenNthCalledWith(
			3,
			nextActionSnapshot,
			expect.objectContaining({ isAdvancing: false }),
		);
		runAiTurnSpy.mockRestore();
	});
});
