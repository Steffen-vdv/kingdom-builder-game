/** @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequirementFailure, RuleSnapshot } from '@kingdom-builder/engine';
import type { Action } from '../../src/state/actionTypes';
import { useActionPerformer } from '../../src/state/useActionPerformer';
import { GameApiError } from '../../src/services/gameApi';
import {
	createSessionSnapshot,
	createSnapshotPlayer,
} from '../helpers/sessionFixtures';
import type { ResourceKey } from '@kingdom-builder/contents';
import {
	createResourceKeys,
	createSessionRegistries,
} from '../helpers/sessionRegistries';

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

const getLegacySessionContextMock = vi.hoisted(() => vi.fn());

vi.mock('../../src/state/getLegacySessionContext', () => ({
	getLegacySessionContext: getLegacySessionContextMock,
}));

vi.mock('../../src/state/sessionSdk', () => ({
	performSessionAction: performSessionActionMock,
}));

describe('useActionPerformer', () => {
	let session: { getSnapshot: () => ReturnType<typeof createSessionSnapshot> };
	let action: Action;
	let pushErrorToast: ReturnType<typeof vi.fn>;
	let addLog: ReturnType<typeof vi.fn>;
	let enqueueMock: ReturnType<
		typeof vi.fn<(task: () => Promise<void>) => Promise<void>>
	>;
	let sessionSnapshot: ReturnType<typeof createSessionSnapshot>;
	let resourceKeys: ResourceKey[];
	let actionCostResource: ResourceKey;
	let ruleSnapshot: RuleSnapshot;
	let registries: ReturnType<typeof createSessionRegistries>;
	const sessionId = 'test-session';
	let onFatalSessionError: ReturnType<typeof vi.fn>;

	beforeEach(() => {
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
			id: 'player-1',
			name: 'Hero',
			resources: { [actionCostResource]: 5 },
		});
		const opponent = createSnapshotPlayer({
			id: 'player-2',
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
		registries = createSessionRegistries();
		enqueueMock = vi.fn(async (task: () => Promise<void>) => {
			await task();
		});
		session = {
			getSnapshot: vi.fn(() => sessionSnapshot),
		};
		action = { id: 'action.attack', name: 'Attack' };
		pushErrorToast = vi.fn();
		addLog = vi.fn();
		onFatalSessionError = vi.fn();
		getLegacySessionContextMock.mockReturnValue({
			translationContext: {
				actions: new Map([
					[action.id, { icon: '⚔️', name: action.name, effects: [] }],
				]),
			},
			diffContext: {},
		});
	});

	it('calls fatal handler when action fails due to network issue', async () => {
		const error = new Error('Network offline');
		performSessionActionMock.mockRejectedValueOnce(error);
		const showResolution = vi.fn().mockResolvedValue(undefined);
		const syncPhaseState = vi.fn();
		const refresh = vi.fn();
		const endTurn = vi.fn();
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

		expect(onFatalSessionError).toHaveBeenCalledWith(error);
		expect(pushErrorToast).not.toHaveBeenCalled();
		expect(addLog).not.toHaveBeenCalled();
		expect(enqueueMock).toHaveBeenCalled();
		expect(translateRequirementFailureMock).not.toHaveBeenCalled();
	});

	it('translates requirement failures for authentication errors', async () => {
		const error = new Error('Forbidden');
		const failure = { reason: 'auth' } as RequirementFailure;
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
				onFatalSessionError,
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
		expect(onFatalSessionError).not.toHaveBeenCalled();
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
		performSessionActionMock.mockResolvedValueOnce({
			status: 'success',
			costs: { [actionCostResource]: 1 },
			traces: [],
			snapshot: snapshotAfter,
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
				onFatalSessionError,
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
		expect(onFatalSessionError).not.toHaveBeenCalled();
	});

	it('calls fatal handler when action response lacks requirement data', async () => {
		performSessionActionMock.mockResolvedValueOnce({
			status: 'error',
			error: 'Server exploded',
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
				onFatalSessionError,
			}),
		);

		await act(async () => {
			await result.current.handlePerform(action);
		});

		expect(onFatalSessionError).toHaveBeenCalledWith(
			expect.objectContaining({ message: 'Server exploded' }),
		);
		expect(pushErrorToast).not.toHaveBeenCalled();
		expect(addLog).not.toHaveBeenCalled();
	});

	it('calls fatal handler when API throws a GameApiError', async () => {
		const apiError = new GameApiError('Down', 500, 'Server Error', {});
		performSessionActionMock.mockRejectedValueOnce(apiError);
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

		expect(onFatalSessionError).toHaveBeenCalledWith(apiError);
		expect(pushErrorToast).not.toHaveBeenCalled();
		expect(addLog).not.toHaveBeenCalled();
	});

	it('calls fatal handler when the session cannot be found', async () => {
		const missingSessionError = new Error('Session not found: missing');
		performSessionActionMock.mockRejectedValueOnce(missingSessionError);
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

		expect(onFatalSessionError).toHaveBeenCalledWith(missingSessionError);
		expect(pushErrorToast).not.toHaveBeenCalled();
	});

	it('calls fatal handler when translating the updated snapshot fails', async () => {
		getLegacySessionContextMock.mockImplementationOnce(() => ({
			translationContext: {
				actions: new Map([
					[action.id, { icon: '⚔️', name: action.name, effects: [] }],
				]),
			},
			diffContext: {},
		}));
		getLegacySessionContextMock.mockImplementationOnce(() => {
			throw new Error('context failure');
		});
		performSessionActionMock.mockResolvedValueOnce({
			status: 'success',
			snapshot: sessionSnapshot,
			costs: {},
			traces: [],
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
				onFatalSessionError,
			}),
		);

		await act(async () => {
			await result.current.handlePerform(action);
		});

		expect(onFatalSessionError).toHaveBeenCalledWith(
			expect.objectContaining({ message: 'context failure' }),
		);
		expect(pushErrorToast).not.toHaveBeenCalled();
	});

	it('calls fatal handler when the initial session context fails to build', async () => {
		getLegacySessionContextMock.mockImplementationOnce(() => {
			throw new Error('initial context failure');
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
				onFatalSessionError,
			}),
		);

		await act(async () => {
			await result.current.handlePerform(action);
		});

		expect(onFatalSessionError).toHaveBeenCalledWith(
			expect.objectContaining({ message: 'initial context failure' }),
		);
		expect(performSessionActionMock).not.toHaveBeenCalled();
	});
});
