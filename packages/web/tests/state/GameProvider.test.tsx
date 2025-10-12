/** @vitest-environment jsdom */
import React from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import type { LegacySession } from '../../src/state/sessionTypes';
import { GameProvider, useGameEngine } from '../../src/state/GameContext';
import {
	createSessionSnapshot,
	createSnapshotPlayer,
} from '../helpers/sessionFixtures';
import type { ResourceKey } from '@kingdom-builder/contents';
import {
	createResourceKeys,
	createSessionRegistries,
} from '../helpers/sessionRegistries';

const createSessionMock = vi.hoisted(() => vi.fn());
const fetchSnapshotMock = vi.hoisted(() => vi.fn());
const releaseSessionMock = vi.hoisted(() => vi.fn());

vi.mock('../../src/state/sessionSdk', () => ({
	createSession: createSessionMock,
	fetchSnapshot: fetchSnapshotMock,
	releaseSession: releaseSessionMock,
}));

const runUntilActionPhaseMock = vi.hoisted(() => vi.fn());
const runUntilActionPhaseCoreMock = vi.hoisted(() => vi.fn());
const handleEndTurnMock = vi.hoisted(() => vi.fn());
const addLogMock = vi.hoisted(() => vi.fn());
const pushToastMock = vi.hoisted(() => vi.fn());
const pushErrorToastMock = vi.hoisted(() => vi.fn());
const pushSuccessToastMock = vi.hoisted(() => vi.fn());
const dismissToastMock = vi.hoisted(() => vi.fn());
const showResolutionMock = vi.hoisted(() => vi.fn());
const acknowledgeResolutionMock = vi.hoisted(() => vi.fn());
const handlePerformMock = vi.hoisted(() => vi.fn());
const createTranslationContextMock = vi.hoisted(() => vi.fn(() => ({})));
let capturedPhaseOptions:
	| (Record<string, unknown> & { refresh?: () => void })
	| undefined;

vi.mock('../../src/state/useTimeScale', () => ({
	useTimeScale: () => ({
		timeScale: 1,
		setTimeScale: vi.fn(),
		clearTrackedTimeout: vi.fn(),
		setTrackedTimeout: vi
			.fn<(callback: () => void, _delay: number) => number>()
			.mockImplementation((callback) => {
				callback();
				return 1;
			}),
		clearTrackedInterval: vi.fn(),
		setTrackedInterval: vi.fn(),
		isMountedRef: { current: true },
		timeScaleRef: { current: 1 },
	}),
	TIME_SCALE_OPTIONS: [1, 2, 5, 100] as const,
}));

vi.mock('../../src/state/useHoverCard', () => ({
	useHoverCard: () => ({
		hoverCard: null,
		handleHoverCard: vi.fn(),
		clearHoverCard: vi.fn(),
	}),
}));

vi.mock('../../src/state/useGameLog', () => ({
	useGameLog: () => ({
		log: [],
		logOverflowed: false,
		addLog: addLogMock,
	}),
	ACTION_EFFECT_DELAY: 600,
}));

vi.mock('../../src/state/useActionResolution', () => ({
	useActionResolution: () => ({
		resolution: null,
		showResolution: showResolutionMock,
		acknowledgeResolution: acknowledgeResolutionMock,
	}),
}));

vi.mock('../../src/state/usePhaseProgress', () => ({
	usePhaseProgress: (options: Record<string, unknown>) => {
		capturedPhaseOptions = options;
		return {
			phase: {
				currentPhaseId: 'phase-main',
				isActionPhase: true,
				canEndTurn: true,
				isAdvancing: false,
			},
			runUntilActionPhase: runUntilActionPhaseMock,
			runUntilActionPhaseCore: runUntilActionPhaseCoreMock,
			handleEndTurn: handleEndTurnMock,
			endTurn: vi.fn(),
			applyPhaseSnapshot: vi.fn(),
			refreshPhaseState: vi.fn(),
		};
	},
}));

vi.mock('../../src/state/useActionPerformer', () => ({
	useActionPerformer: () => ({
		handlePerform: handlePerformMock,
		performRef: { current: handlePerformMock },
	}),
}));

vi.mock('../../src/state/useToasts', () => ({
	useToasts: () => ({
		toasts: [],
		pushToast: pushToastMock,
		pushErrorToast: pushErrorToastMock,
		pushSuccessToast: pushSuccessToastMock,
		dismissToast: dismissToastMock,
	}),
}));

vi.mock('../../src/state/useCompensationLogger', () => ({
	useCompensationLogger: vi.fn(),
}));

vi.mock('../../src/state/useAiRunner', () => ({
	useAiRunner: vi.fn(),
}));

vi.mock('../../src/translation/context', () => ({
	createTranslationContext: createTranslationContextMock,
}));

vi.mock('../../src/state/sessionSelectors', () => ({
	selectSessionView: vi.fn(() => ({
		list: [],
		byId: new Map(),
		active: null,
		opponent: null,
		actions: [],
		actionList: [],
		actionsByPlayer: new Map(),
		buildings: [],
		buildingList: [],
		developments: [],
		developmentList: [],
	})),
}));

function SessionInspector() {
	const { sessionState } = useGameEngine();
	return <div data-testid="session-turn">turn:{sessionState.game.turn}</div>;
}

describe('GameProvider', () => {
	let session: LegacySession;
	let registries: ReturnType<typeof createSessionRegistries>;
	let resourceKeys: ResourceKey[];
	beforeEach(() => {
		createSessionMock.mockReset();
		fetchSnapshotMock.mockReset();
		releaseSessionMock.mockReset();
		runUntilActionPhaseMock.mockReset();
		runUntilActionPhaseCoreMock.mockReset();
		handleEndTurnMock.mockReset();
		addLogMock.mockReset();
		pushToastMock.mockReset();
		pushErrorToastMock.mockReset();
		pushSuccessToastMock.mockReset();
		dismissToastMock.mockReset();
		showResolutionMock.mockReset();
		acknowledgeResolutionMock.mockReset();
		handlePerformMock.mockReset();
		createTranslationContextMock.mockReset();
		createTranslationContextMock.mockImplementation(() => ({}));
		capturedPhaseOptions = undefined;
		runUntilActionPhaseMock.mockResolvedValue(undefined);

		const [resourceKey] = createResourceKeys();
		if (!resourceKey) {
			throw new Error('RESOURCE_KEYS is empty');
		}
		const phases = [
			{
				id: 'phase-main',
				name: 'Main Phase',
				action: true,
				steps: [{ id: 'phase-main:start', name: 'Start' }],
			},
		];
		const ruleSnapshot = {
			tieredResourceKey: resourceKey,
			tierDefinitions: [],
			winConditions: [],
		} as const;
		const player = createSnapshotPlayer({
			id: 'player-1',
			name: 'Commander',
			resources: { [resourceKey]: 10 },
		});
		const opponent = createSnapshotPlayer({
			id: 'player-2',
			name: 'Rival',
			resources: { [resourceKey]: 6 },
		});
		const initialSnapshot = createSessionSnapshot({
			players: [player, opponent],
			activePlayerId: player.id,
			opponentId: opponent.id,
			phases,
			actionCostResource: resourceKey,
			ruleSnapshot,
			turn: 1,
			currentPhase: phases[0]?.id ?? 'phase-main',
			currentStep: phases[0]?.steps?.[0]?.id ?? phases[0]?.id ?? 'phase-main',
		});
		const refreshedSnapshot = createSessionSnapshot({
			players: [
				createSnapshotPlayer({
					id: player.id,
					name: player.name,
					resources: player.resources,
				}),
				createSnapshotPlayer({
					id: opponent.id,
					name: opponent.name,
					resources: opponent.resources,
				}),
			],
			activePlayerId: player.id,
			opponentId: opponent.id,
			phases,
			actionCostResource: resourceKey,
			ruleSnapshot,
			turn: 2,
			currentPhase: phases[0]?.id ?? 'phase-main',
			currentStep: phases[0]?.steps?.[0]?.id ?? phases[0]?.id ?? 'phase-main',
		});
		registries = createSessionRegistries();
		resourceKeys = [resourceKey];
		const enqueueMock = vi.fn(async <T,>(task: () => Promise<T> | T) => {
			return await task();
		});
		session = {
			enqueue: enqueueMock,
			updatePlayerName: vi.fn(),
			pullEffectLog: vi.fn(),
			getPassiveEvaluationMods: vi.fn(() => ({})),
			getSnapshot: vi.fn(() => initialSnapshot),
			advancePhase: vi.fn(),
			getActionCosts: vi.fn(() => ({})),
			performAction: vi.fn(),
			setDevMode: vi.fn(),
		} as unknown as LegacySession;
		createSessionMock.mockResolvedValue({
			sessionId: 'session-1',
			session,
			legacySession: session,
			snapshot: initialSnapshot,
			ruleSnapshot: initialSnapshot.rules,
			registries,
			resourceKeys,
			metadata: initialSnapshot.metadata,
		});
		fetchSnapshotMock.mockResolvedValue({
			session,
			legacySession: session,
			snapshot: refreshedSnapshot,
			ruleSnapshot: refreshedSnapshot.rules,
			registries,
			resourceKeys,
			metadata: refreshedSnapshot.metadata,
		});
	});

	afterEach(() => {
		cleanup();
	});

	it('creates a session and renders children after loading completes', async () => {
		render(
			<GameProvider devMode playerName="Commander">
				<SessionInspector />
			</GameProvider>,
		);

		expect(screen.queryByTestId('session-turn')).toBeNull();

		await waitFor(() =>
			expect(screen.getByTestId('session-turn')).toHaveTextContent('turn:1'),
		);

		await waitFor(() =>
			expect(createSessionMock).toHaveBeenCalledWith(
				{
					devMode: true,
					playerName: 'Commander',
				},
				expect.objectContaining({
					signal: expect.any(AbortSignal),
				}),
			),
		);

		await waitFor(() =>
			expect(runUntilActionPhaseMock).toHaveBeenCalledTimes(1),
		);
	});

	it('refreshes the session state when hooks request a snapshot', async () => {
		render(
			<GameProvider devMode={false} playerName="Scout">
				<SessionInspector />
			</GameProvider>,
		);

		await waitFor(() =>
			expect(screen.getByTestId('session-turn')).toHaveTextContent('turn:1'),
		);

		expect(capturedPhaseOptions?.refresh).toBeTypeOf('function');

		await act(() => {
			capturedPhaseOptions?.refresh?.();
			return waitFor(() =>
				expect(fetchSnapshotMock).toHaveBeenCalledWith(
					'session-1',
					expect.objectContaining({
						signal: expect.any(AbortSignal),
					}),
				),
			);
		});

		await waitFor(() =>
			expect(screen.getByTestId('session-turn')).toHaveTextContent('turn:2'),
		);
	});

	it('releases the active session on unmount', async () => {
		const { unmount } = render(
			<GameProvider playerName="Commander">
				<SessionInspector />
			</GameProvider>,
		);

		await waitFor(() =>
			expect(screen.getByTestId('session-turn')).toHaveTextContent('turn:1'),
		);

		unmount();

		await waitFor(() =>
			expect(releaseSessionMock).toHaveBeenCalledWith('session-1'),
		);
	});

	it('shows the fatal error screen when action phase sync fails', async () => {
		const fatalError = new Error('session exploded');
		runUntilActionPhaseMock.mockRejectedValueOnce(fatalError);

		render(
			<GameProvider playerName="Commander">
				<SessionInspector />
			</GameProvider>,
		);

		await waitFor(() =>
			expect(
				screen.getByText('We could not load your kingdom.'),
			).toBeInTheDocument(),
		);

		await waitFor(() =>
			expect(releaseSessionMock).toHaveBeenCalledWith('session-1'),
		);

		expect(
			screen.getByText('An unexpected error prevented the game from loading.'),
		).toBeInTheDocument();
	});

	it('shows the fatal error screen when the translation context fails to initialize', async () => {
		const fatalError = new Error('translation context failed');
		createTranslationContextMock.mockImplementationOnce(() => {
			throw fatalError;
		});

		render(
			<GameProvider playerName="Commander">
				<SessionInspector />
			</GameProvider>,
		);

		await waitFor(() =>
			expect(
				screen.getByText('We could not load your kingdom.'),
			).toBeInTheDocument(),
		);

		await waitFor(() =>
			expect(releaseSessionMock).toHaveBeenCalledWith('session-1'),
		);

		expect(
			screen.getByText('An unexpected error prevented the game from loading.'),
		).toBeInTheDocument();
	});
});
