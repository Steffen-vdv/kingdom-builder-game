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
			.fn<[], Promise<void>>()
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
				runUntilActionPhaseCore: vi.fn(),
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
			...activePlayer.resources,
			[actionCostResource]:
				(activePlayer.resources[actionCostResource] ?? 0) - 1,
		};
		const secondResources = {
			...firstResources,
			[actionCostResource]: (firstResources[actionCostResource] ?? 0) - 1,
		};
		const firstTrace = createTrace(activePlayer.resources, firstResources);
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
						resources: firstResources,
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
						resources: secondResources,
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
		const runUntilActionPhaseCore = vi.fn().mockResolvedValue(undefined);

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
		runAiTurnSpy.mockRestore();
	});

	it('continues polling until the phase completes when empty action batches arrive', async () => {
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
			resources: { [actionCostResource]: 3 },
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
		const firstResources = {
			...activePlayer.resources,
			[actionCostResource]:
				(activePlayer.resources[actionCostResource] ?? 0) - 1,
		};
		const secondResources = {
			...firstResources,
			[actionCostResource]: (firstResources[actionCostResource] ?? 0) - 1,
		};
		const finalResources = {
			...secondResources,
			[actionCostResource]: secondResources[actionCostResource] ?? 0,
		};
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
						resources: firstResources,
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
						resources: secondResources,
					};
				}),
			},
		};
		const finalSnapshot = {
			...secondSnapshot,
			game: {
				...secondSnapshot.game,
				players: secondSnapshot.game.players.map((player) => {
					if (player.id !== activePlayer.id) {
						return player;
					}
					return {
						...player,
						resources: finalResources,
					};
				}),
			},
		};
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
		const firstTrace = createTrace(activePlayer.resources, firstResources);
		const firstResolution = createDeferred();
		const showResolution = vi
			.fn<[], Promise<void>>()
			.mockReturnValueOnce(firstResolution.promise);
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
					actions: [],
					phaseComplete: false,
					snapshot: secondSnapshot,
					registries: record.registries,
				});
			})
			.mockImplementationOnce(() => {
				updateSessionSnapshot(sessionId, finalSnapshot);
				return Promise.resolve({
					ranTurn: true,
					actions: [],
					phaseComplete: true,
					snapshot: finalSnapshot,
					registries: record.registries,
				});
			});
		const syncPhaseState = vi.fn();
		const mountedRef = { current: true };
		const runUntilActionPhaseCore = vi.fn().mockResolvedValue(undefined);

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
			await Promise.resolve();
		});

		expect(runAiTurnSpy).toHaveBeenCalledTimes(3);
		expect(showResolution).toHaveBeenCalledTimes(1);

		await act(async () => {
			await Promise.resolve();
			await Promise.resolve();
		});

		expect(runUntilActionPhaseCore).toHaveBeenCalledTimes(1);
		expect(syncPhaseState).toHaveBeenNthCalledWith(1, firstSnapshot);
		expect(syncPhaseState).toHaveBeenNthCalledWith(2, secondSnapshot);
		expect(syncPhaseState).toHaveBeenNthCalledWith(3, finalSnapshot);
		expect(syncPhaseState).toHaveBeenNthCalledWith(4, finalSnapshot, {
			isAdvancing: true,
			canEndTurn: false,
		});
		runAiTurnSpy.mockRestore();
	});
});
