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
} from '../../src/state/sessionStateStore';
import * as sessionAiModule from '../../src/state/sessionAi';
import type { ActionConfig } from '@kingdom-builder/protocol';

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
		const sessionId = 'session-ai';
		const record = initializeSessionState({
			sessionId,
			snapshot: sessionState,
			registries,
		});
		const fatalError = new Error('failed to reach action phase');
		const runUntilActionPhaseCore = vi
			.fn<[], Promise<void>>()
			.mockRejectedValueOnce(fatalError);
		const onFatalSessionError = vi.fn();
		const syncPhaseState = vi.fn();
		const mountedRef = { current: true };
		const showResolution = vi.fn<[], Promise<void>>(() => Promise.resolve());
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
		const enqueueSpy = vi
			.spyOn(sessionAiModule, 'enqueueSessionTask')
			.mockImplementation(async (_session, task) => {
				await task();
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
				registries: record.registries,
				resourceKeys: record.resourceKeys,
				actionCostResource,
				addResolutionLog,
			}),
		);

		await act(async () => {
			await Promise.resolve();
		});

		expect(syncPhaseState).toHaveBeenCalledWith(record.snapshot);
		expect(
			syncPhaseState.mock.calls.some(([, overrides]) => {
				return (
					overrides?.isAdvancing === true && overrides?.canEndTurn === false
				);
			}),
		).toBe(true);
		expect(runUntilActionPhaseCore).toHaveBeenCalledTimes(1);
		expect(onFatalSessionError).toHaveBeenCalledTimes(1);
		expect(onFatalSessionError).toHaveBeenCalledWith(fatalError);
		expect(showResolution).not.toHaveBeenCalled();
		expect(addResolutionLog).not.toHaveBeenCalled();
		runAiTurnSpy.mockRestore();
		enqueueSpy.mockRestore();
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
		const sessionId = 'session-ai';
		const record = initializeSessionState({
			sessionId,
			snapshot: sessionState,
			registries,
		});
		const fatalError = new Error('fatal AI failure');
		const onFatalSessionError = vi.fn();
		const runAiTurnSpy = vi
			.spyOn(sessionAiModule, 'runAiTurn')
			.mockRejectedValueOnce(fatalError);
		const syncPhaseState = vi.fn();
		const mountedRef = { current: true };
		const showResolution = vi.fn<[], Promise<void>>(() => Promise.resolve());
		const addResolutionLog = vi.fn();

		renderHook(() =>
			useAiRunner({
				sessionId,
				sessionSnapshot: sessionState,
				runUntilActionPhaseCore: vi.fn(),
				syncPhaseState,
				mountedRef,
				onFatalSessionError,
				showResolution,
				registries: record.registries,
				resourceKeys: record.resourceKeys,
				actionCostResource,
				addResolutionLog,
			}),
		);

		await act(async () => {
			await Promise.resolve();
		});

		expect(onFatalSessionError).toHaveBeenCalledWith(fatalError);
		expect(syncPhaseState).not.toHaveBeenCalled();
		expect(showResolution).not.toHaveBeenCalled();
		expect(addResolutionLog).not.toHaveBeenCalled();
		runAiTurnSpy.mockRestore();
	});

	it('presents AI actions sequentially and advances after acknowledgement', async () => {
		const resourceKeys = createResourceKeys();
		const actionCostResource = resourceKeys[0];
		const gainResourceOne = resourceKeys[1];
		const gainResourceTwo = resourceKeys[2];
		if (!actionCostResource || !gainResourceOne || !gainResourceTwo) {
			throw new Error('RESOURCE_KEYS is incomplete');
		}
		const phases = [
			{
				id: 'phase-main',
				name: 'Main Phase',
				action: true,
				steps: [],
			},
		];
		const actionOneDefinition = {
			id: 'test.action.one',
			name: 'Action One',
			icon: '①',
			baseCosts: { [actionCostResource]: 1 },
			effects: [
				{
					type: 'resource',
					method: 'add',
					params: { key: gainResourceOne, amount: 2 },
				},
			],
		};
		const actionTwoDefinition = {
			id: 'test.action.two',
			name: 'Action Two',
			icon: '②',
			baseCosts: { [actionCostResource]: 1 },
			effects: [
				{
					type: 'resource',
					method: 'add',
					params: { key: gainResourceTwo, amount: 3 },
				},
			],
		};
		const registriesPayload = createSessionRegistriesPayload();
		registriesPayload.actions = {
			...(registriesPayload.actions ?? {}),
			[actionOneDefinition.id]: actionOneDefinition as ActionConfig,
			[actionTwoDefinition.id]: actionTwoDefinition as ActionConfig,
		};
		const activePlayerBefore = createSnapshotPlayer({
			id: 'A',
			name: 'Agent A',
			aiControlled: true,
			resources: {
				[actionCostResource]: 3,
				[gainResourceOne]: 0,
				[gainResourceTwo]: 0,
			},
		});
		const opponent = createSnapshotPlayer({ id: 'B' });
		const sessionState = createSessionSnapshot({
			players: [activePlayerBefore, opponent],
			activePlayerId: activePlayerBefore.id,
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
		const sessionId = 'session-sequence';
		const record = initializeSessionState({
			sessionId,
			snapshot: sessionState,
			registries: registriesPayload,
		});
		const activePlayerAfter = createSnapshotPlayer({
			id: activePlayerBefore.id,
			name: activePlayerBefore.name,
			aiControlled: true,
			resources: {
				[actionCostResource]: 1,
				[gainResourceOne]: 2,
				[gainResourceTwo]: 3,
			},
		});
		const finalSnapshot = createSessionSnapshot({
			players: [activePlayerAfter, opponent],
			activePlayerId: activePlayerAfter.id,
			opponentId: opponent.id,
			phases,
			actionCostResource,
			ruleSnapshot: sessionState.rules,
			currentPhase: phases[0]?.id,
			currentStep: phases[0]?.id,
			phaseIndex: 0,
		});
		const firstAction = {
			actionId: actionOneDefinition.id,
			costs: { [actionCostResource]: 1 },
			traces: [
				{
					id: actionOneDefinition.id,
					before: {
						resources: {
							[actionCostResource]: 3,
							[gainResourceOne]: 0,
							[gainResourceTwo]: 0,
						},
						stats: {},
						buildings: [],
						lands: [],
						passives: [],
					},
					after: {
						resources: {
							[actionCostResource]: 2,
							[gainResourceOne]: 2,
							[gainResourceTwo]: 0,
						},
						stats: {},
						buildings: [],
						lands: [],
						passives: [],
					},
				},
			],
		};
		const secondAction = {
			actionId: actionTwoDefinition.id,
			costs: { [actionCostResource]: 1 },
			traces: [
				{
					id: actionTwoDefinition.id,
					before: {
						resources: {
							[actionCostResource]: 2,
							[gainResourceOne]: 2,
							[gainResourceTwo]: 0,
						},
						stats: {},
						buildings: [],
						lands: [],
						passives: [],
					},
					after: {
						resources: {
							[actionCostResource]: 1,
							[gainResourceOne]: 2,
							[gainResourceTwo]: 3,
						},
						stats: {},
						buildings: [],
						lands: [],
						passives: [],
					},
				},
			],
		};
		const runAiTurnSpy = vi
			.spyOn(sessionAiModule, 'runAiTurn')
			.mockResolvedValueOnce({
				ranTurn: true,
				actions: [firstAction, secondAction],
				phaseComplete: true,
				snapshot: finalSnapshot,
				registries: record.registries,
			});
		let queuedTask: (() => Promise<void> | void) | null = null;
		const enqueueSpy = vi
			.spyOn(sessionAiModule, 'enqueueSessionTask')
			.mockImplementation((_session, task) => {
				queuedTask = task;
				return Promise.resolve();
			});
		const shownActions: string[] = [];
		const resolvers: Array<() => void> = [];
		const showResolution = vi.fn(async (options) => {
			const actionId = options.action?.id ?? '';
			shownActions.push(actionId);
			return await new Promise<void>((resolve) => {
				resolvers.push(resolve);
			});
		});
		const addResolutionLog = vi.fn();
		const syncPhaseState = vi.fn();
		const mountedRef = { current: true };
		const runUntilActionPhaseCore = vi.fn(() => Promise.resolve());

		renderHook(() =>
			useAiRunner({
				sessionId,
				sessionSnapshot: sessionState,
				runUntilActionPhaseCore,
				syncPhaseState,
				mountedRef,
				showResolution,
				registries: record.registries,
				resourceKeys: record.resourceKeys,
				actionCostResource,
				addResolutionLog,
			}),
		);

		await act(async () => {
			await Promise.resolve();
		});

		expect(showResolution).toHaveBeenCalledTimes(1);
		expect(shownActions).toEqual([actionOneDefinition.id]);
		expect(enqueueSpy).not.toHaveBeenCalled();

		await act(async () => {
			const resolveFirst = resolvers.shift();
			resolveFirst?.();
			await Promise.resolve();
		});

		expect(showResolution).toHaveBeenCalledTimes(2);
		expect(shownActions).toEqual([
			actionOneDefinition.id,
			actionTwoDefinition.id,
		]);
		expect(enqueueSpy).not.toHaveBeenCalled();

		await act(async () => {
			const resolveSecond = resolvers.shift();
			resolveSecond?.();
			await Promise.resolve();
		});

		expect(enqueueSpy).toHaveBeenCalledTimes(1);
		expect(runUntilActionPhaseCore).not.toHaveBeenCalled();
		expect(addResolutionLog).not.toHaveBeenCalled();

		await act(async () => {
			await queuedTask?.();
		});

		expect(runUntilActionPhaseCore).toHaveBeenCalledTimes(1);
		expect(
			syncPhaseState.mock.calls.some(([, overrides]) => {
				return overrides?.isAdvancing === true;
			}),
		).toBe(true);

		runAiTurnSpy.mockRestore();
		enqueueSpy.mockRestore();
	});
});
