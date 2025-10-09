/** @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequirementFailure } from '@kingdom-builder/engine';
import type { Action } from '../../src/state/actionTypes';
import { useActionPerformer } from '../../src/state/useActionPerformer';
import {
	createSessionSnapshot,
	createSnapshotPlayer,
} from '../helpers/sessionFixtures';
import {
	RESOURCE_KEYS,
	type ResourceKey,
} from '../../src/state/sessionContent';

const resolveActionEffectsMock = vi.hoisted(() => vi.fn(() => ({})));

vi.mock('@kingdom-builder/protocol', async () => {
	const actual = (await vi.importActual('@kingdom-builder/protocol')) as Record<
		string,
		unknown
	>;
	return {
		...actual,
		resolveActionEffects: resolveActionEffectsMock,
	};
});

const translateRequirementFailureMock = vi.hoisted(() => vi.fn());
const snapshotPlayerMock = vi.hoisted(() => vi.fn((player) => player));
const logContentMock = vi.hoisted(() => vi.fn(() => []));
const diffStepSnapshotsMock = vi.hoisted(() => vi.fn(() => []));
const performSessionActionMock = vi.hoisted(() => vi.fn());

const formatActionLogLinesMock = vi.hoisted(() =>
	vi.fn((entries: (string | { text: string })[]) =>
		entries.map((entry) => (typeof entry === 'string' ? entry : entry.text)),
	),
);
const formatDevelopActionLogLinesMock = vi.hoisted(() =>
	vi.fn((entries: (string | { text: string })[]) =>
		entries.map((entry) => (typeof entry === 'string' ? entry : entry.text)),
	),
);

vi.mock('../../src/translation', () => ({
	diffStepSnapshots: diffStepSnapshotsMock,
	logContent: logContentMock,
	snapshotPlayer: snapshotPlayerMock,
	translateRequirementFailure: translateRequirementFailureMock,
}));

vi.mock('../../src/state/actionLogFormat', () => ({
	formatActionLogLines: formatActionLogLinesMock,
	formatDevelopActionLogLines: formatDevelopActionLogLinesMock,
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
	const sessionId = 'test-session';

	beforeEach(() => {
		vi.clearAllMocks();
		performSessionActionMock.mockReset();
		logContentMock.mockReturnValue([]);
		diffStepSnapshotsMock.mockReturnValue([]);
		snapshotPlayerMock.mockImplementation((player) => player);
		resolveActionEffectsMock.mockReturnValue({});
		formatActionLogLinesMock.mockImplementation((entries) =>
			entries.map((entry) => (typeof entry === 'string' ? entry : entry.text)),
		);
		formatDevelopActionLogLinesMock.mockImplementation((entries) =>
			entries.map((entry) => (typeof entry === 'string' ? entry : entry.text)),
		);
		const [firstResourceKey] = RESOURCE_KEYS;
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
		const ruleSnapshot = {
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
		enqueueMock = vi.fn(async (task: () => Promise<void>) => {
			await task();
		});
		session = {
			getSnapshot: vi.fn(() => sessionSnapshot),
		};
		action = { id: 'action.attack', name: 'Attack' };
		pushErrorToast = vi.fn();
		addLog = vi.fn();
		getLegacySessionContextMock.mockReturnValue({
			translationContext: {
				actions: new Map([[action.id, { icon: '⚔️' }]]),
			},
			diffContext: {},
		});
	});

	it('shows error toast when action fails due to network issue', async () => {
		const error = new Error('Network offline');
		performSessionActionMock.mockRejectedValueOnce(error);
		const showResolution = vi.fn().mockResolvedValue(undefined);
		const updateMainPhaseStep = vi.fn();
		const refresh = vi.fn();
		const endTurn = vi.fn();
		const { result } = renderHook(() =>
			useActionPerformer({
				session,
				sessionId,
				actionCostResource,
				addLog,
				showResolution,
				updateMainPhaseStep,
				refresh,
				pushErrorToast,
				mountedRef: { current: true },
				endTurn,
				enqueue: enqueueMock,
				resourceKeys,
			}),
		);

		await act(async () => {
			await result.current.handlePerform(action);
		});

		expect(pushErrorToast).toHaveBeenCalledWith('Network offline');
		expect(addLog).toHaveBeenCalledWith(
			'Failed to play ⚔️ Attack: Network offline',
			{
				id: sessionSnapshot.game.activePlayerId,
				name: sessionSnapshot.game.players[0]?.name ?? 'Hero',
			},
		);
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
				addLog,
				showResolution: vi.fn().mockResolvedValue(undefined),
				updateMainPhaseStep: vi.fn(),
				refresh: vi.fn(),
				pushErrorToast,
				mountedRef: { current: true },
				endTurn: vi.fn(),
				enqueue: enqueueMock,
				resourceKeys,
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

	it('passes enriched action metadata to the resolution modal on success', async () => {
		const showResolution = vi.fn().mockResolvedValue(undefined);
		const updateMainPhaseStep = vi.fn();
		const refresh = vi.fn();
		const endTurn = vi.fn().mockResolvedValue(undefined);
		const [playerBefore, opponentBefore] = sessionSnapshot.game.players;
		if (!playerBefore || !opponentBefore) {
			throw new Error('Expected players in initial snapshot');
		}
		const afterPlayer = createSnapshotPlayer({
			id: playerBefore.id,
			name: playerBefore.name,
			resources: { [actionCostResource]: 3 },
		});
		const afterOpponent = createSnapshotPlayer({
			id: opponentBefore.id,
			name: opponentBefore.name,
			resources: opponentBefore.resources,
		});
		const afterSnapshot = createSessionSnapshot({
			players: [afterPlayer, afterOpponent],
			activePlayerId: afterPlayer.id,
			opponentId: afterOpponent.id,
			phases: sessionSnapshot.phases,
			actionCostResource,
			ruleSnapshot: sessionSnapshot.rules,
			turn: sessionSnapshot.game.turn + 1,
			currentPhase: sessionSnapshot.game.currentPhase,
			currentStep: sessionSnapshot.game.currentStep,
		});
		logContentMock.mockReturnValue(['⚔️ Attack', 'Damage dealt']);
		performSessionActionMock.mockResolvedValueOnce({
			status: 'success',
			snapshot: afterSnapshot,
			costs: {},
			traces: [],
		});
		const { result } = renderHook(() =>
			useActionPerformer({
				session,
				sessionId,
				actionCostResource,
				addLog,
				showResolution,
				updateMainPhaseStep,
				refresh,
				pushErrorToast,
				mountedRef: { current: true },
				endTurn,
				enqueue: enqueueMock,
				resourceKeys,
			}),
		);

		await act(async () => {
			await result.current.handlePerform(action);
		});

		expect(showResolution).toHaveBeenCalledTimes(1);
		const resolutionCall = showResolution.mock.calls[0]?.[0];
		expect(resolutionCall?.actorLabel).toBe('Played by');
		expect(resolutionCall?.source).toEqual({
			kind: 'action',
			label: 'Action',
			id: action.id,
			name: 'Attack',
			icon: '⚔️',
		});
	});
});
