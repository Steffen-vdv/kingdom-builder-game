/** @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePhaseProgress } from '../../src/state/usePhaseProgress';
import { SessionMirroringError } from '../../src/state/sessionSdk';
import {
	createSessionSnapshot,
	createSnapshotPlayer,
} from '../helpers/sessionFixtures';
import {
	createResourceKeys,
	createSessionRegistries,
} from '../helpers/sessionRegistries';

const advanceSessionPhaseMock = vi.hoisted(() => vi.fn());
const advanceToActionPhaseMock = vi.hoisted(() => vi.fn());

vi.mock('../../src/state/sessionSdk', async () => {
	const actual = await vi.importActual('../../src/state/sessionSdk');
	return {
		...(actual as Record<string, unknown>),
		advanceSessionPhase: advanceSessionPhaseMock,
	};
});

vi.mock('../../src/state/usePhaseProgress.helpers', () => ({
	advanceToActionPhase: advanceToActionPhaseMock,
}));

describe('usePhaseProgress', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		advanceSessionPhaseMock.mockReset();
		advanceToActionPhaseMock.mockReset();
		advanceToActionPhaseMock.mockResolvedValue(undefined);
	});

	it('invokes fatal handler when advancing the session fails', async () => {
		const [actionCostResource] = createResourceKeys();
		if (!actionCostResource) {
			throw new Error('RESOURCE_KEYS is empty');
		}
		const player = createSnapshotPlayer({
			id: 'player-1',
			name: 'Hero',
			resources: { [actionCostResource]: 0 },
		});
		const opponent = createSnapshotPlayer({
			id: 'player-2',
			name: 'Rival',
			resources: { [actionCostResource]: 0 },
		});
		const phases = [
			{ id: 'phase-main', label: 'Main Phase', action: true, steps: [] },
		];
		const sessionSnapshot = createSessionSnapshot({
			players: [player, opponent],
			activePlayerId: player.id,
			opponentId: opponent.id,
			phases,
			actionCostResource,
			ruleSnapshot: {
				tieredResourceKey: actionCostResource,
				tierDefinitions: [],
				winConditions: [],
			},
			turn: 1,
			currentPhase: phases[0]?.id ?? 'phase-main',
			currentStep: phases[0]?.id ?? 'phase-main',
		});
		const session = {
			getSnapshot: vi.fn(() => sessionSnapshot),
		};
		const enqueue = vi.fn(async <T>(task: () => Promise<T> | T) => {
			return await task();
		});
		const error = new SessionMirroringError('Session unavailable', {
			cause: new Error('mirror'),
		});
		advanceSessionPhaseMock.mockRejectedValueOnce(error);
		const onFatalSessionError = vi.fn();
		const { result } = renderHook(() =>
			usePhaseProgress({
				session: session as never,
				sessionState: sessionSnapshot,
				sessionId: 'session-1',
				actionCostResource,
				mountedRef: { current: true },
				refresh: vi.fn(),
				resourceKeys: [actionCostResource],
				enqueue,
				registries: createSessionRegistries(),
				showResolution: vi.fn().mockResolvedValue(undefined),
				onFatalSessionError,
			}),
		);

		await act(async () => {
			await result.current.handleEndTurn();
		});

		expect(onFatalSessionError).toHaveBeenCalledWith(error);
		expect(result.current.phase.isAdvancing).toBe(false);
		expect(advanceSessionPhaseMock).toHaveBeenCalledWith({
			sessionId: 'session-1',
		});
		expect(enqueue).toHaveBeenCalled();
	});
});
