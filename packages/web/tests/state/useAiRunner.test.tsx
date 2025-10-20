/** @vitest-environment jsdom */
import React, { useEffect, useRef } from 'react';
import { act, cleanup, render, renderHook } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createContentFactory } from '@kingdom-builder/testing';
import type { SessionSnapshot } from '@kingdom-builder/protocol/session';
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
import type {
	SessionRegistries,
	SessionResourceKey,
} from '../../src/state/sessionTypes';
import type {
	ActionResolution,
	ShowResolutionOptions,
} from '../../src/state/useActionResolution';
import { deserializeSessionRegistries } from '../../src/state/sessionRegistries';
import * as sessionStateStoreModule from '../../src/state/sessionStateStore';
import * as sessionAiModule from '../../src/state/sessionAi';
import * as buildActionResolutionModule from '../../src/state/buildActionResolution';

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
	sessionStateStoreModule.clearSessionStateStore();
});

function createRunnerDependencies() {
	const registriesPayload = createSessionRegistriesPayload();
	const registries = deserializeSessionRegistries(registriesPayload);
	const resourceKeys = createResourceKeys() as SessionResourceKey[];
	const showResolution = vi
		.fn<(options: ShowResolutionOptions) => Promise<void>>()
		.mockResolvedValue(undefined);
	const addResolutionLog = vi.fn<(resolution: ActionResolution) => void>();
	return {
		registriesPayload,
		registries,
		resourceKeys,
		showResolution,
		addResolutionLog,
	};
}

interface AiRunnerHarnessProps {
	sessionId: string;
	snapshot: SessionSnapshot;
	registries: SessionRegistries;
	resourceKeys: SessionResourceKey[];
	actionCostResource: SessionResourceKey;
	showResolution: (options: ShowResolutionOptions) => Promise<void>;
	runUntilActionPhaseCore: () => Promise<void>;
	syncPhaseState: (
		snapshot: SessionSnapshot,
		overrides?: Record<string, unknown>,
	) => void;
	addResolutionLog: (resolution: ActionResolution) => void;
}

function AiRunnerHarness({
	sessionId,
	snapshot,
	registries,
	resourceKeys,
	actionCostResource,
	showResolution,
	runUntilActionPhaseCore,
	syncPhaseState,
	addResolutionLog,
}: AiRunnerHarnessProps) {
	const mountedRef = useRef(true);
	useEffect(() => {
		mountedRef.current = true;
		return () => {
			mountedRef.current = false;
		};
	}, []);
	useAiRunner({
		sessionId,
		sessionSnapshot: snapshot,
		runUntilActionPhaseCore,
		syncPhaseState,
		mountedRef,
		showResolution,
		registries,
		resourceKeys,
		actionCostResource,
		addResolutionLog,
	});
	return null;
}

describe('useAiRunner', () => {
	beforeEach(() => {
		sessionStateStoreModule.clearSessionStateStore();
	});

	it('forwards fatal errors from the action phase runner', async () => {
		const {
			registriesPayload,
			registries,
			resourceKeys,
			showResolution,
			addResolutionLog,
		} = createRunnerDependencies();
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
		const sessionId = 'session-ai';
		const record = sessionStateStoreModule.initializeSessionState({
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
				registries,
				resourceKeys,
				actionCostResource,
				addResolutionLog,
				onFatalSessionError,
			}),
		);

		await act(async () => {
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
		runAiTurnSpy.mockRestore();
	});

	it('stops background turns when the AI run reports a fatal error', async () => {
		const {
			registriesPayload,
			registries,
			resourceKeys,
			showResolution,
			addResolutionLog,
		} = createRunnerDependencies();
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
		const sessionId = 'session-ai';
		sessionStateStoreModule.initializeSessionState({
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

		renderHook(() =>
			useAiRunner({
				sessionId,
				sessionSnapshot: sessionState,
				runUntilActionPhaseCore: vi.fn(),
				syncPhaseState,
				mountedRef,
				showResolution,
				registries,
				resourceKeys,
				actionCostResource,
				addResolutionLog,
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

	it('presents AI actions sequentially before advancing the phase', async () => {
		const factory = createContentFactory();
		const registries = createSessionRegistries();
		const resourceKeys = createResourceKeys() as SessionResourceKey[];
		const [actionCostResource] = resourceKeys;
		if (!actionCostResource) {
			throw new Error('RESOURCE_KEYS is empty');
		}
		const firstActionDefinition = factory.action();
		const secondActionDefinition = factory.action();
		registries.actions.add(firstActionDefinition.id, firstActionDefinition);
		registries.actions.add(secondActionDefinition.id, secondActionDefinition);
		const phases = [
			{
				id: 'phase-main',
				name: 'Main Phase',
				action: true,
				steps: [],
			},
		];
		const aiPlayer = createSnapshotPlayer({
			id: 'A',
			name: 'AI Player',
			aiControlled: true,
			resources: { [actionCostResource]: 5 },
			actions: [firstActionDefinition.id, secondActionDefinition.id],
		});
		const opponent = createSnapshotPlayer({
			id: 'B',
			name: 'Opponent',
			resources: { [actionCostResource]: 5 },
		});
		const ruleSnapshot = {
			tieredResourceKey: actionCostResource,
			tierDefinitions: [],
			winConditions: [],
		};
		const sessionSnapshot = createSessionSnapshot({
			players: [aiPlayer, opponent],
			activePlayerId: aiPlayer.id,
			opponentId: opponent.id,
			phases,
			actionCostResource,
			ruleSnapshot,
		});
		const finalSnapshot = createSessionSnapshot({
			players: [
				{
					...aiPlayer,
					resources: { [actionCostResource]: 3 },
				},
				{ ...opponent },
			],
			activePlayerId: aiPlayer.id,
			opponentId: opponent.id,
			phases,
			actionCostResource,
			ruleSnapshot,
		});
		const sessionId = 'session-sequence';
		vi.spyOn(sessionAiModule, 'hasAiController').mockReturnValue(true);
		const enqueueSessionTaskSpy = vi
			.spyOn(sessionAiModule, 'enqueueSessionTask')
			.mockImplementation((_, task) => Promise.resolve().then(() => task()));
		vi.spyOn(sessionStateStoreModule, 'getSessionSnapshot').mockReturnValue(
			finalSnapshot,
		);
		const runAiTurnSpy = vi
			.spyOn(sessionAiModule, 'runAiTurn')
			.mockResolvedValue({
				ranTurn: true,
				actions: [
					{
						actionId: firstActionDefinition.id,
						costs: { [actionCostResource]: 1 },
						traces: [
							{
								id: 'trace-1',
								before: aiPlayer,
								after: {
									...aiPlayer,
									resources: {
										[actionCostResource]: 4,
									},
								},
							},
						],
					},
					{
						actionId: secondActionDefinition.id,
						costs: { [actionCostResource]: 1 },
						traces: [
							{
								id: 'trace-2',
								before: {
									...aiPlayer,
									resources: {
										[actionCostResource]: 4,
									},
								},
								after: {
									...aiPlayer,
									resources: {
										[actionCostResource]: 3,
									},
								},
							},
						],
					},
				],
				phaseComplete: true,
				snapshot: finalSnapshot,
				registries,
			});
		const buildActionResolutionSpy = vi
			.spyOn(buildActionResolutionModule, 'buildActionResolution')
			.mockImplementation(({ actionId }) => ({
				messages: [],
				timeline: [],
				logLines: [`${actionId}-log`],
				summaries: [`${actionId}-summary`],
				headline: `${actionId}-headline`,
			}));
		const showResolvers: Array<() => void> = [];
		const showResolution = vi.fn(
			(options: ShowResolutionOptions) =>
				new Promise<void>((resolve) => {
					void options;
					showResolvers.push(resolve);
				}),
		);
		const runUntilActionPhaseCore = vi.fn().mockResolvedValue(undefined);
		const syncPhaseState = vi.fn();
		const addResolutionLog = vi.fn();

		render(
			<AiRunnerHarness
				sessionId={sessionId}
				snapshot={sessionSnapshot}
				registries={registries}
				resourceKeys={[actionCostResource]}
				actionCostResource={actionCostResource}
				showResolution={showResolution}
				runUntilActionPhaseCore={runUntilActionPhaseCore}
				syncPhaseState={syncPhaseState}
				addResolutionLog={addResolutionLog}
			/>,
		);

		await act(async () => {
			await Promise.resolve();
		});

		expect(runAiTurnSpy).toHaveBeenCalledTimes(1);
		expect(syncPhaseState).toHaveBeenCalledWith(finalSnapshot);
		expect(showResolution).toHaveBeenCalledTimes(1);
		const firstOptions = showResolution.mock.calls[0]?.[0];
		expect(firstOptions?.lines).toEqual([`${firstActionDefinition.id}-log`]);
		expect(enqueueSessionTaskSpy).not.toHaveBeenCalled();
		expect(runUntilActionPhaseCore).not.toHaveBeenCalled();

		await act(async () => {
			const resolve = showResolvers.shift();
			if (resolve) {
				resolve();
			}
			await Promise.resolve();
		});

		expect(showResolution).toHaveBeenCalledTimes(2);
		const secondOptions = showResolution.mock.calls[1]?.[0];
		expect(secondOptions?.lines).toEqual([`${secondActionDefinition.id}-log`]);
		expect(enqueueSessionTaskSpy).not.toHaveBeenCalled();
		expect(runUntilActionPhaseCore).not.toHaveBeenCalled();

		await act(async () => {
			const resolve = showResolvers.shift();
			if (resolve) {
				resolve();
			}
			await Promise.resolve();
		});

		expect(enqueueSessionTaskSpy).toHaveBeenCalledTimes(1);
		expect(runUntilActionPhaseCore).toHaveBeenCalledTimes(1);
		expect(buildActionResolutionSpy).toHaveBeenCalledTimes(2);
	});
});
