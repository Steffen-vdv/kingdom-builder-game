/** @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePhaseProgress } from '../../src/state/usePhaseProgress';
import { SessionMirroringError } from '../../src/state/sessionErrors';
import {
	createSessionSnapshot,
	createSnapshotPlayer,
} from '../helpers/sessionFixtures';
import {
	createResourceKeys,
	createSessionRegistries,
	createSessionRegistriesPayload,
} from '../helpers/sessionRegistries';
import {
	clearSessionStateStore,
	initializeSessionState,
} from '../../src/state/sessionStateStore';

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
		clearSessionStateStore();
	});

	it('uses latest fatal handler when advancing to action phase', async () => {
		const [actionCostResource] = createResourceKeys();
		if (!actionCostResource) {
			throw new Error('RESOURCE_KEYS is empty');
		}
		const player = createSnapshotPlayer({
			id: 'A',
			name: 'Hero',
			resources: { [actionCostResource]: 0 },
		});
		const opponent = createSnapshotPlayer({
			id: 'B',
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
		initializeSessionState({
			sessionId: 'session-1',
			snapshot: sessionSnapshot,
			registries: createSessionRegistriesPayload(),
		});
		const enqueue = vi.fn(async <T>(task: () => Promise<T> | T) => {
			return await task();
		});
		const firstFatalHandler = vi.fn();
		const secondFatalHandler = vi.fn();
		const { result, rerender } = renderHook(
			({ fatalHandler }: { fatalHandler: (error: unknown) => void }) =>
				usePhaseProgress({
					sessionState: sessionSnapshot,
					sessionId: 'session-1',
					actionCostResource,
					mountedRef: { current: true },
					refresh: vi.fn(),
					resourceKeys: [actionCostResource],
					enqueue,
					registries: createSessionRegistries(),
					showResolution: vi.fn().mockResolvedValue(undefined),
					onFatalSessionError: fatalHandler,
				}),
			{
				initialProps: { fatalHandler: firstFatalHandler },
			},
		);

		await act(async () => {
			await result.current.runUntilActionPhase();
		});

		expect(advanceToActionPhaseMock).toHaveBeenCalledTimes(1);
		const firstCall = advanceToActionPhaseMock.mock.calls[0]?.[0];
		expect(firstCall?.onFatalSessionError).toBe(firstFatalHandler);

		rerender({ fatalHandler: secondFatalHandler });

		await act(async () => {
			await result.current.runUntilActionPhase();
		});

		expect(advanceToActionPhaseMock).toHaveBeenCalledTimes(2);
		const secondCall = advanceToActionPhaseMock.mock.calls[1]?.[0];
		expect(secondCall?.onFatalSessionError).toBe(secondFatalHandler);
		expect(enqueue).toHaveBeenCalledTimes(2);
	});

	it('invokes fatal handler when advancing the session fails', async () => {
		const [actionCostResource] = createResourceKeys();
		if (!actionCostResource) {
			throw new Error('RESOURCE_KEYS is empty');
		}
		const player = createSnapshotPlayer({
			id: 'A',
			name: 'Hero',
			resources: { [actionCostResource]: 0 },
		});
		const opponent = createSnapshotPlayer({
			id: 'B',
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
		initializeSessionState({
			sessionId: 'session-1',
			snapshot: sessionSnapshot,
			registries: createSessionRegistriesPayload(),
		});
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
		expect(advanceSessionPhaseMock).toHaveBeenCalledWith(
			{ sessionId: 'session-1' },
			undefined,
			expect.objectContaining({ skipQueue: true }),
		);
		expect(enqueue).toHaveBeenCalled();
	});

	it('invokes fatal handler when advanceSessionPhase throws', async () => {
		const [actionCostResource] = createResourceKeys();
		if (!actionCostResource) {
			throw new Error('RESOURCE_KEYS is empty');
		}
		const player = createSnapshotPlayer({
			id: 'A',
			name: 'Hero',
			resources: { [actionCostResource]: 0 },
		});
		const opponent = createSnapshotPlayer({
			id: 'B',
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
		initializeSessionState({
			sessionId: 'session-1',
			snapshot: sessionSnapshot,
			registries: createSessionRegistriesPayload(),
		});
		const enqueue = vi.fn(async <T>(task: () => Promise<T> | T) => {
			return await task();
		});
		const error = new Error('Session not found');
		advanceSessionPhaseMock.mockRejectedValueOnce(error);
		const onFatalSessionError = vi.fn();
		const { result } = renderHook(() =>
			usePhaseProgress({
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
		expect(advanceSessionPhaseMock).toHaveBeenCalledWith(
			{ sessionId: 'session-1' },
			undefined,
			expect.objectContaining({ skipQueue: true }),
		);
		expect(enqueue).toHaveBeenCalled();
	});
});
