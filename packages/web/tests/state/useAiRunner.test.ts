/** @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAiRunner } from '../../src/state/useAiRunner';
import type { ShowResolutionOptions } from '../../src/state/useActionResolution';
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
} from '../../src/state/sessionStateStore';
import * as sessionAiModule from '../../src/state/sessionAi';

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
		const registries = record.registries;
		const fatalError = new Error('failed to reach action phase');
		const runUntilActionPhaseCore = vi
			.fn<[], Promise<void>>()
			.mockRejectedValueOnce(fatalError);
		const onFatalSessionError = vi.fn();
		const syncPhaseState = vi.fn();
		const mountedRef = { current: true };
		const showResolution = vi
			.fn<[ShowResolutionOptions], Promise<void>>()
			.mockResolvedValue(undefined);
		const addResolutionLog = vi.fn();
		const resourceKeys = createResourceKeys();
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
				onFatalSessionError,
				showResolution,
				registries,
				resourceKeys,
				actionCostResource,
				addResolutionLog,
			}),
		);

		await act(async () => {
			await Promise.resolve();
			await Promise.resolve();
		});

		expect(syncPhaseState).toHaveBeenNthCalledWith(1, record.snapshot);
		expect(syncPhaseState).toHaveBeenNthCalledWith(2, record.snapshot, {
			isAdvancing: true,
			canEndTurn: false,
		});
		expect(runUntilActionPhaseCore).toHaveBeenCalledTimes(1);
		expect(onFatalSessionError).toHaveBeenCalledTimes(1);
		expect(onFatalSessionError).toHaveBeenCalledWith(fatalError);
		expect(showResolution).not.toHaveBeenCalled();
		expect(addResolutionLog).not.toHaveBeenCalled();
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
		const registries = record.registries;
		const fatalError = new Error('fatal AI failure');
		const onFatalSessionError = vi.fn();
		const runAiTurnSpy = vi
			.spyOn(sessionAiModule, 'runAiTurn')
			.mockRejectedValueOnce(fatalError);
		const syncPhaseState = vi.fn();
		const mountedRef = { current: true };
		const showResolution = vi
			.fn<[ShowResolutionOptions], Promise<void>>()
			.mockResolvedValue(undefined);
		const addResolutionLog = vi.fn();
		const resourceKeys = createResourceKeys();

		renderHook(() =>
			useAiRunner({
				sessionId,
				sessionSnapshot: sessionState,
				runUntilActionPhaseCore: vi.fn(),
				syncPhaseState,
				mountedRef,
				onFatalSessionError,
				showResolution,
				registries,
				resourceKeys,
				actionCostResource,
				addResolutionLog,
			}),
		);

		await act(async () => {
			await Promise.resolve();
		});

		expect(onFatalSessionError).toHaveBeenCalledWith(fatalError);
		expect(syncPhaseState).not.toHaveBeenCalled();
		runAiTurnSpy.mockRestore();
	});

	it('requests additional AI actions after the prior resolution completes', async () => {
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
			resources: { ap: 0, gold: 3, happiness: 1 },
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
		const registries = record.registries;
		const runUntilActionPhaseCore = vi
			.fn<[], Promise<void>>()
			.mockResolvedValue(undefined);
		const syncPhaseState = vi.fn();
		const mountedRef = { current: true };
		const resourceKeys = createResourceKeys();
		const showResolvers: Array<() => void> = [];
		const showResolution = vi
			.fn<[ShowResolutionOptions], Promise<void>>()
			.mockImplementation(
				() =>
					new Promise<void>((resolve) => {
						showResolvers.push(resolve);
					}),
			);
		const addResolutionLog = vi.fn();
		const firstTrace = {
			id: 'expand',
			before: {
				resources: { ap: 1, gold: 5, happiness: 0 },
				stats: {},
				buildings: [],
				lands: [],
				passives: [],
			},
			after: {
				resources: { ap: 0, gold: 3, happiness: 1 },
				stats: {},
				buildings: [],
				lands: [],
				passives: [],
			},
		};
		const runAiTurnSpy = vi
			.spyOn(sessionAiModule, 'runAiTurn')
			.mockResolvedValueOnce({
				ranTurn: true,
				actions: [
					{
						actionId: 'expand',
						costs: { ap: 1, gold: 2 },
						traces: [firstTrace],
					},
				],
				phaseComplete: false,
				snapshot: record.snapshot,
				registries: record.registries,
			})
			.mockResolvedValueOnce({
				ranTurn: false,
				actions: [],
				phaseComplete: false,
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
				registries,
				resourceKeys,
				actionCostResource,
				addResolutionLog,
			}),
		);

		await act(async () => {
			await Promise.resolve();
			await Promise.resolve();
		});

		expect(runAiTurnSpy).toHaveBeenCalledTimes(1);
		expect(showResolution).toHaveBeenCalledTimes(1);
		expect(runUntilActionPhaseCore).not.toHaveBeenCalled();

		const resolveFirst = showResolvers.shift();
		if (!resolveFirst) {
			throw new Error('Expected a pending resolution');
		}
		await act(async () => {
			resolveFirst();
			await Promise.resolve();
			await Promise.resolve();
		});

		expect(runAiTurnSpy).toHaveBeenCalledTimes(2);
		expect(runUntilActionPhaseCore).not.toHaveBeenCalled();
		runAiTurnSpy.mockRestore();
	});

	it('advances the phase after acknowledging all AI resolutions', async () => {
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
			resources: { ap: 0, gold: 0, happiness: 2 },
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
		const registries = record.registries;
		const resourceKeys = createResourceKeys();
		const showResolvers: Array<() => void> = [];
		const showResolution = vi
			.fn<[ShowResolutionOptions], Promise<void>>()
			.mockImplementation(
				() =>
					new Promise<void>((resolve) => {
						showResolvers.push(resolve);
					}),
			);
		const addResolutionLog = vi.fn();
		const syncPhaseState = vi.fn();
		const mountedRef = { current: true };
		const runUntilActionPhaseCore = vi
			.fn<[], Promise<void>>()
			.mockResolvedValue(undefined);
		const enqueueSpy = vi
			.spyOn(sessionAiModule, 'enqueueSessionTask')
			.mockImplementation((_sessionId, task) => Promise.resolve(task()));
		const firstTrace = {
			id: 'expand',
			before: {
				resources: { ap: 1, gold: 5, happiness: 0 },
				stats: {},
				buildings: [],
				lands: [],
				passives: [],
			},
			after: {
				resources: { ap: 0, gold: 3, happiness: 1 },
				stats: {},
				buildings: [],
				lands: [],
				passives: [],
			},
		};
		const secondTrace = {
			id: 'develop',
			before: {
				resources: { ap: 1, gold: 3, happiness: 1 },
				stats: {},
				buildings: [],
				lands: [],
				passives: [],
			},
			after: {
				resources: { ap: 0, gold: 0, happiness: 2 },
				stats: {},
				buildings: [],
				lands: [],
				passives: [],
			},
		};
		const runAiTurnSpy = vi
			.spyOn(sessionAiModule, 'runAiTurn')
			.mockResolvedValueOnce({
				ranTurn: true,
				actions: [
					{
						actionId: 'expand',
						costs: { ap: 1, gold: 2 },
						traces: [firstTrace],
					},
					{
						actionId: 'develop',
						costs: { ap: 1, gold: 3 },
						traces: [secondTrace],
					},
				],
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
				registries,
				resourceKeys,
				actionCostResource,
				addResolutionLog,
			}),
		);

		await act(async () => {
			await Promise.resolve();
			await Promise.resolve();
		});

		expect(showResolution).toHaveBeenCalledTimes(1);
		expect(runUntilActionPhaseCore).not.toHaveBeenCalled();

		const resolveFirst = showResolvers.shift();
		if (!resolveFirst) {
			throw new Error('Missing first resolver');
		}
		await act(async () => {
			resolveFirst();
			await Promise.resolve();
			await Promise.resolve();
		});

		expect(showResolution).toHaveBeenCalledTimes(2);
		expect(runUntilActionPhaseCore).not.toHaveBeenCalled();

		const resolveSecond = showResolvers.shift();
		if (!resolveSecond) {
			throw new Error('Missing second resolver');
		}
		await act(async () => {
			resolveSecond();
			await Promise.resolve();
			await Promise.resolve();
		});

		expect(runUntilActionPhaseCore).toHaveBeenCalledTimes(1);
		runAiTurnSpy.mockRestore();
		enqueueSpy.mockRestore();
	});
});
