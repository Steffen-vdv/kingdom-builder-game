/** @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
	EngineSession,
	RequirementFailure,
} from '@kingdom-builder/engine';
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

const translateRequirementFailureMock = vi.hoisted(() => vi.fn());
const snapshotPlayerMock = vi.hoisted(() => vi.fn((player) => player));
const logContentMock = vi.hoisted(() => vi.fn(() => []));
const performSessionActionMock = vi.hoisted(() => vi.fn());

vi.mock('../../src/translation', () => ({
	diffStepSnapshots: vi.fn(),
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
	let session: EngineSession;
	let action: Action;
	let pushErrorToast: ReturnType<typeof vi.fn>;
	let addLog: ReturnType<typeof vi.fn>;
	let enqueueMock: ReturnType<
		typeof vi.fn<(task: () => Promise<void>) => Promise<void>>
	>;
	let getActionCostsMock: ReturnType<typeof vi.fn>;
	let sessionSnapshot: ReturnType<typeof createSessionSnapshot>;
	let resourceKeys: ResourceKey[];
	let actionCostResource: ResourceKey;
	const sessionId = 'test-session';

	beforeEach(() => {
		vi.clearAllMocks();
		performSessionActionMock.mockReset();
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
		getActionCostsMock = vi.fn(() => ({}));
		enqueueMock = vi.fn(async (task: () => Promise<void>) => {
			await task();
		});
		session = {
			getSnapshot: vi.fn(() => sessionSnapshot),
			getActionCosts: getActionCostsMock,
			enqueue: enqueueMock,
			advancePhase: vi.fn(),
		} as unknown as EngineSession;
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
});
