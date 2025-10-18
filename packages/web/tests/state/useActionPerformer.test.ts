/** @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Action } from '../../src/state/actionTypes';
import { useActionPerformer } from '../../src/state/useActionPerformer';
import { SessionMirroringError } from '../../src/state/sessionErrors';
import {
	createSessionSnapshot,
	createSnapshotPlayer,
} from '../helpers/sessionFixtures';
import type { SessionAdapter } from '../../src/state/sessionTypes';
import type {
	SessionRequirementFailure,
	SessionResourceDefinition,
	SessionRuleSnapshot,
} from '@kingdom-builder/protocol/session';
import {
	createResourceKeys,
	createSessionRegistries,
	createSessionRegistriesPayload,
} from '../helpers/sessionRegistries';
import {
	createRemoteSessionAdapter,
	type RemoteSessionAdapterHarness,
} from '../helpers/remoteSessionAdapter';
import {
	clearSessionStateStore,
	updateSessionSnapshot,
} from '../../src/state/sessionStateStore';

const translateRequirementFailureMock = vi.hoisted(() => vi.fn());
const snapshotPlayerMock = vi.hoisted(() => vi.fn((player) => player));
const logContentMock = vi.hoisted(() => vi.fn(() => []));
const diffStepSnapshotsMock = vi.hoisted(() => vi.fn(() => []));
const performSessionActionMock = vi.hoisted(() => vi.fn());

vi.mock('../../src/translation', () => ({
	diffStepSnapshots: diffStepSnapshotsMock,
	logContent: logContentMock,
	snapshotPlayer: snapshotPlayerMock,
	translateRequirementFailure: translateRequirementFailureMock,
}));

const createSessionTranslationContextMock = vi.hoisted(() => vi.fn());

vi.mock('../../src/state/createSessionTranslationContext', () => ({
	createSessionTranslationContext: createSessionTranslationContextMock,
}));

vi.mock('../../src/state/sessionSdk', async () => {
	const actual = await vi.importActual('../../src/state/sessionSdk');
	return {
		...(actual as Record<string, unknown>),
		performSessionAction: performSessionActionMock,
	};
});

describe('useActionPerformer', () => {
	let session: SessionAdapter;
	let action: Action;
	let pushErrorToast: ReturnType<typeof vi.fn>;
	let addLog: ReturnType<typeof vi.fn>;
	let enqueueMock: ReturnType<
		typeof vi.fn<(task: () => Promise<void>) => Promise<void>>
	>;
	let sessionSnapshot: ReturnType<typeof createSessionSnapshot>;
	let resourceKeys: Array<SessionResourceDefinition['key']>;
	let actionCostResource: SessionResourceDefinition['key'];
	let ruleSnapshot: SessionRuleSnapshot;
	let registries: ReturnType<typeof createSessionRegistries>;
	let registriesPayload: ReturnType<typeof createSessionRegistriesPayload>;
	let sessionHarness: RemoteSessionAdapterHarness | null;
	const sessionId = 'test-session';

	beforeEach(() => {
		clearSessionStateStore();
		sessionHarness = null;
		vi.clearAllMocks();
		performSessionActionMock.mockReset();
		diffStepSnapshotsMock.mockReset();
		diffStepSnapshotsMock.mockReturnValue([]);
		logContentMock.mockReset();
		logContentMock.mockReturnValue([]);
		snapshotPlayerMock.mockReset();
		snapshotPlayerMock.mockImplementation((player) => player);
		const [firstResourceKey] = createResourceKeys();
		if (!firstResourceKey) {
			throw new Error('RESOURCE_KEYS is empty');
		}
		actionCostResource = firstResourceKey;
		const phases = [
			{
				id: 'phase-main',
				name: 'Main Phase',
				action: true,
				steps: [],
			},
		];
		ruleSnapshot = {
			tieredResourceKey: actionCostResource,
			tierDefinitions: [],
			winConditions: [],
		};
		const player = createSnapshotPlayer({
			id: 'A',
			name: 'Hero',
			resources: { [actionCostResource]: 5 },
		});
		const opponent = createSnapshotPlayer({
			id: 'B',
			name: 'Rival',
			resources: { [actionCostResource]: 4 },
		});
		sessionSnapshot = createSessionSnapshot({
			players: [player, opponent],
			activePlayerId: player.id,
			opponentId: opponent.id,
			phases,
			actionCostResource,
			ruleSnapshot,
			turn: 1,
			currentPhase: phases[0]?.id ?? 'phase-main',
			currentStep: phases[0]?.id ?? 'phase-main',
		});
		resourceKeys = [actionCostResource];
		registriesPayload = createSessionRegistriesPayload();
		registries = createSessionRegistries();
		enqueueMock = vi.fn(async (task: () => Promise<void>) => {
			await task();
		});
		sessionHarness = createRemoteSessionAdapter({
			sessionId,
			snapshot: sessionSnapshot,
			registries: registriesPayload,
		});
		session = sessionHarness.adapter;
		action = { id: 'action.attack', name: 'Attack' };
		pushErrorToast = vi.fn();
		addLog = vi.fn();
		createSessionTranslationContextMock.mockReturnValue({
			translationContext: {
				actions: new Map([
					[action.id, { icon: '⚔️', name: action.name, effects: [] }],
				]),
			},
			diffContext: {},
		});
	});

	afterEach(() => {
		if (sessionHarness) {
			sessionHarness.cleanup();
			sessionHarness = null;
		}
	});

	it('flags fatal transport failures instead of showing a toast', async () => {
		performSessionActionMock.mockResolvedValueOnce({
			status: 'error',
			error: 'Network offline',
			fatal: true,
		});
		const showResolution = vi.fn().mockResolvedValue(undefined);
		const syncPhaseState = vi.fn();
		const refresh = vi.fn();
		const endTurn = vi.fn();
		const onFatalSessionError = vi.fn();
		const { result } = renderHook(() =>
			useActionPerformer({
				session,
				sessionId,
				actionCostResource,
				registries,
				addLog,
				showResolution,
				syncPhaseState,
				refresh,
				pushErrorToast,
				mountedRef: { current: true },
				endTurn,
				enqueue: enqueueMock,
				resourceKeys,
				onFatalSessionError,
			}),
		);

		await act(async () => {
			await result.current.handlePerform(action);
		});

		expect(onFatalSessionError).toHaveBeenCalledTimes(1);
		expect(onFatalSessionError).toHaveBeenCalledWith(
			expect.objectContaining({ message: 'Network offline' }),
		);
		expect(pushErrorToast).not.toHaveBeenCalled();
		expect(addLog).not.toHaveBeenCalled();
		expect(enqueueMock).toHaveBeenCalled();
		expect(translateRequirementFailureMock).not.toHaveBeenCalled();
	});

	it('translates requirement failures for authentication errors', async () => {
		const error = new Error('Forbidden');
		const failure = { reason: 'auth' } as SessionRequirementFailure;
		const authMessage = 'Authentication required';
		translateRequirementFailureMock.mockReturnValue(authMessage);
		performSessionActionMock.mockResolvedValueOnce({
			status: 'error',
			error: error.message,
			requirementFailure: failure,
		});
		const { result } = renderHook(() =>
			useActionPerformer({
				session,
				sessionId,
				actionCostResource,
				registries,
				addLog,
				showResolution: vi.fn().mockResolvedValue(undefined),
				syncPhaseState: vi.fn(),
				refresh: vi.fn(),
				pushErrorToast,
				mountedRef: { current: true },
				endTurn: vi.fn(),
				enqueue: enqueueMock,
				resourceKeys,
				onFatalSessionError: undefined,
			}),
		);

		await act(async () => {
			await result.current.handlePerform(action);
		});

		expect(translateRequirementFailureMock).toHaveBeenCalledWith(
			failure,
			expect.anything(),
		);
		expect(pushErrorToast).toHaveBeenCalledWith(authMessage);
		expect(addLog).toHaveBeenCalledWith(
			`Failed to play ⚔️ Attack: ${authMessage}`,
			{
				id: sessionSnapshot.game.activePlayerId,
				name: sessionSnapshot.game.players[0]?.name ?? 'Hero',
			},
		);
	});

	it('uses requirement failures array when single failure field is missing', async () => {
		const error = new Error('Requirements failed');
		const failure = { reason: 'missing-resource' } as SessionRequirementFailure;
		const translated = 'You need more resources.';
		translateRequirementFailureMock.mockReturnValue(translated);
		performSessionActionMock.mockResolvedValueOnce({
			status: 'error',
			error: error.message,
			requirementFailures: [failure],
		});
		const { result } = renderHook(() =>
			useActionPerformer({
				session,
				sessionId,
				actionCostResource,
				registries,
				addLog,
				showResolution: vi.fn().mockResolvedValue(undefined),
				syncPhaseState: vi.fn(),
				refresh: vi.fn(),
				pushErrorToast,
				mountedRef: { current: true },
				endTurn: vi.fn(),
				enqueue: enqueueMock,
				resourceKeys,
				onFatalSessionError: undefined,
			}),
		);

		await act(async () => {
			await result.current.handlePerform(action);
		});

		expect(translateRequirementFailureMock).toHaveBeenCalledWith(
			failure,
			expect.anything(),
		);
		expect(pushErrorToast).toHaveBeenCalledWith(translated);
		expect(addLog).toHaveBeenCalledWith(
			`Failed to play ⚔️ Attack: ${translated}`,
			{
				id: sessionSnapshot.game.activePlayerId,
				name: sessionSnapshot.game.players[0]?.name ?? 'Hero',
			},
		);
	});

	it('treats missing active players as fatal errors', async () => {
		const phases = sessionSnapshot.phases;
		const opponentOnly = createSnapshotPlayer({
			id: 'B',
			name: 'Rival',
			resources: { [actionCostResource]: 4 },
		});
		sessionSnapshot = createSessionSnapshot({
			players: [opponentOnly],
			activePlayerId: 'A',
			opponentId: opponentOnly.id,
			phases,
			actionCostResource,
			ruleSnapshot,
			turn: sessionSnapshot.game.turn,
			currentPhase: sessionSnapshot.game.currentPhase,
			currentStep: sessionSnapshot.game.currentStep,
		});
		updateSessionSnapshot(sessionId, sessionSnapshot);
		const onFatalSessionError = vi.fn();
		const { result } = renderHook(() =>
			useActionPerformer({
				session,
				sessionId,
				actionCostResource,
				registries,
				addLog,
				showResolution: vi.fn().mockResolvedValue(undefined),
				syncPhaseState: vi.fn(),
				refresh: vi.fn(),
				pushErrorToast,
				mountedRef: { current: true },
				endTurn: vi.fn(),
				enqueue: enqueueMock,
				resourceKeys,
				onFatalSessionError,
			}),
		);

		await act(async () => {
			await result.current.handlePerform(action);
		});

		expect(onFatalSessionError).toHaveBeenCalledTimes(1);
		expect(onFatalSessionError).toHaveBeenCalledWith(
			expect.objectContaining({
				message: 'Missing active player before action',
			}),
		);
		expect(performSessionActionMock).not.toHaveBeenCalled();
		expect(pushErrorToast).not.toHaveBeenCalled();
		expect(addLog).not.toHaveBeenCalled();
	});

	it('passes enriched resolution metadata when an action succeeds', async () => {
		const showResolution = vi.fn().mockResolvedValue(undefined);
		const syncPhaseState = vi.fn();
		const refresh = vi.fn();
		const endTurn = vi.fn();
		const [activeBefore, opponentBefore] = sessionSnapshot.game.players;
		if (!activeBefore || !opponentBefore) {
			throw new Error('Expected players in snapshot');
		}
		const updatedPlayer = createSnapshotPlayer({
			id: activeBefore.id,
			name: activeBefore.name,
			resources: {
				...activeBefore.resources,
				[actionCostResource]:
					(activeBefore.resources[actionCostResource] ?? 0) - 1,
			},
		});
		const updatedOpponent = createSnapshotPlayer({
			id: opponentBefore.id,
			name: opponentBefore.name,
			resources: { ...opponentBefore.resources },
		});
		const snapshotAfter = createSessionSnapshot({
			players: [updatedPlayer, updatedOpponent],
			activePlayerId: updatedPlayer.id,
			opponentId: updatedOpponent.id,
			phases: sessionSnapshot.phases,
			actionCostResource,
			ruleSnapshot,
			turn: sessionSnapshot.game.turn,
			currentPhase: sessionSnapshot.game.currentPhase,
			currentStep: sessionSnapshot.game.currentStep,
		});
		performSessionActionMock.mockImplementationOnce(() => {
			sessionSnapshot = snapshotAfter;
			updateSessionSnapshot(sessionId, snapshotAfter);
			return Promise.resolve({
				status: 'success',
				costs: { [actionCostResource]: 1 },
				traces: [],
				snapshot: snapshotAfter,
			});
		});
		logContentMock.mockReturnValue(['⚔️ Attack']);

		const { result } = renderHook(() =>
			useActionPerformer({
				session,
				sessionId,
				actionCostResource,
				registries,
				addLog,
				showResolution,
				syncPhaseState,
				refresh,
				pushErrorToast,
				mountedRef: { current: true },
				endTurn,
				enqueue: enqueueMock,
				resourceKeys,
				onFatalSessionError: undefined,
			}),
		);

		await act(async () => {
			await result.current.handlePerform(action);
		});

		expect(showResolution).toHaveBeenCalledTimes(1);
		expect(showResolution).toHaveBeenLastCalledWith(
			expect.objectContaining({
				source: {
					kind: 'action',
					label: 'Action',
					id: action.id,
					name: action.name,
					icon: '⚔️',
				},
				actorLabel: 'Played by',
			}),
		);
	});

	it('falls back to a generic resolution log when an action definition is missing', async () => {
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const showResolution = vi.fn().mockResolvedValue(undefined);
		const syncPhaseState = vi.fn();
		const refresh = vi.fn();
		const endTurn = vi.fn();
		const [activeBefore, opponentBefore] = sessionSnapshot.game.players;
		if (!activeBefore || !opponentBefore) {
			throw new Error('Expected players in snapshot');
		}
		const updatedPlayer = createSnapshotPlayer({
			id: activeBefore.id,
			name: activeBefore.name,
			resources: {
				...activeBefore.resources,
				[actionCostResource]:
					(activeBefore.resources[actionCostResource] ?? 0) - 1,
			},
		});
		const updatedOpponent = createSnapshotPlayer({
			id: opponentBefore.id,
			name: opponentBefore.name,
			resources: { ...opponentBefore.resources },
		});
		const snapshotAfter = createSessionSnapshot({
			players: [updatedPlayer, updatedOpponent],
			activePlayerId: updatedPlayer.id,
			opponentId: updatedOpponent.id,
			phases: sessionSnapshot.phases,
			actionCostResource,
			ruleSnapshot,
			turn: sessionSnapshot.game.turn,
			currentPhase: sessionSnapshot.game.currentPhase,
			currentStep: sessionSnapshot.game.currentStep,
		});
		performSessionActionMock.mockImplementationOnce(() => {
			sessionSnapshot = snapshotAfter;
			updateSessionSnapshot(sessionId, snapshotAfter);
			return Promise.resolve({
				status: 'success',
				costs: { [actionCostResource]: 1 },
				traces: [],
				snapshot: snapshotAfter,
			});
		});
		createSessionTranslationContextMock.mockReturnValueOnce({
			translationContext: {
				actions: new Map([[action.id, { icon: '⚔️', name: action.name }]]),
			},
			diffContext: {},
		});
		createSessionTranslationContextMock.mockReturnValueOnce({
			translationContext: { actions: new Map() },
			diffContext: {},
		});

		const { result } = renderHook(() =>
			useActionPerformer({
				session,
				sessionId,
				actionCostResource,
				registries,
				addLog,
				showResolution,
				syncPhaseState,
				refresh,
				pushErrorToast,
				mountedRef: { current: true },
				endTurn,
				enqueue: enqueueMock,
				resourceKeys,
				onFatalSessionError: undefined,
			}),
		);

		try {
			await act(async () => {
				await result.current.handlePerform(action);
			});

			expect(warnSpy).toHaveBeenCalledWith(
				`Missing action definition for ${action.id}; using fallback resolution logs.`,
			);
			expect(showResolution).toHaveBeenCalledWith(
				expect.objectContaining({
					lines: [
						`Played ${action.name}`,
						'• No detailed log available because the action definition was missing.',
					],
					summaries: [],
				}),
			);
			expect(addLog).toHaveBeenCalledWith(
				[
					`Played ${action.name}`,
					'• No detailed log available because the action definition was missing.',
				],
				{
					id: snapshotAfter.game.activePlayerId,
					name: snapshotAfter.game.players[0]?.name ?? updatedPlayer.name,
				},
			);
			expect(diffStepSnapshotsMock).not.toHaveBeenCalled();
			expect(logContentMock).not.toHaveBeenCalled();
		} finally {
			warnSpy.mockRestore();
		}
	});

	it('executes actions while skipping redundant queue hops', async () => {
		performSessionActionMock.mockResolvedValueOnce({
			status: 'success',
			snapshot: sessionSnapshot,
			costs: {},
			traces: [],
		});
		const localEnqueue = vi.fn(async (task: () => Promise<void>) => {
			await task();
		});
		const { result } = renderHook(() =>
			useActionPerformer({
				session,
				sessionId,
				actionCostResource,
				registries,
				addLog,
				showResolution: vi.fn().mockResolvedValue(undefined),
				syncPhaseState: vi.fn(),
				refresh: vi.fn(),
				pushErrorToast,
				mountedRef: { current: true },
				endTurn: vi.fn(),
				enqueue: localEnqueue,
				resourceKeys,
				onFatalSessionError: undefined,
			}),
		);

		await act(async () => {
			await result.current.handlePerform(action);
		});

		expect(localEnqueue).toHaveBeenCalledTimes(1);
		expect(performSessionActionMock).toHaveBeenCalledWith(
			{
				sessionId,
				actionId: action.id,
			},
			undefined,
			expect.objectContaining({ skipQueue: true }),
		);
	});

	it('reports mirroring failures via onFatalSessionError', async () => {
		const fatalCause = new Error('mirror failed');
		const fatalError = new SessionMirroringError('Mirroring failed', {
			cause: fatalCause,
		});
		performSessionActionMock.mockRejectedValueOnce(fatalError);
		const showResolution = vi.fn().mockResolvedValue(undefined);
		const syncPhaseState = vi.fn();
		const refresh = vi.fn();
		const endTurn = vi.fn();
		const onFatalSessionError = vi.fn();
		const { result } = renderHook(() =>
			useActionPerformer({
				session,
				sessionId,
				actionCostResource,
				registries,
				addLog,
				showResolution,
				syncPhaseState,
				refresh,
				pushErrorToast,
				mountedRef: { current: true },
				endTurn,
				enqueue: enqueueMock,
				resourceKeys,
				onFatalSessionError,
			}),
		);

		await act(async () => {
			await result.current.handlePerform(action);
		});

		expect(onFatalSessionError).toHaveBeenCalledWith(fatalError);
		expect(pushErrorToast).not.toHaveBeenCalled();
		expect(addLog).not.toHaveBeenCalled();
	});
});
