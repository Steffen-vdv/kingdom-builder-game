/** @vitest-environment jsdom */
import React from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import type { SessionAdapter } from '../../src/state/sessionTypes';
import { GameProvider, useGameEngine } from '../../src/state/GameContext';
import { SessionMirroringError } from '../../src/state/sessionErrors';
import {
	createSessionSnapshot,
	createSnapshotPlayer,
} from '../helpers/sessionFixtures';
import type {
	SessionCreateResponse,
	SessionStateResponse,
} from '@kingdom-builder/protocol/session';
import {
	createResourceKeys,
	createSessionRegistriesPayload,
} from '../helpers/sessionRegistries';
import {
	applySessionState,
	clearSessionStateStore,
} from '../../src/state/sessionStateStore';
import {
	createRemoteSessionAdapter,
	type RemoteSessionAdapterHarness,
} from '../helpers/remoteSessionAdapter';

const createSessionMock = vi.hoisted(() => vi.fn());
const fetchSnapshotMock = vi.hoisted(() => vi.fn());
const releaseSessionMock = vi.hoisted(() => vi.fn());
const setSessionDevModeMock = vi.hoisted(() => vi.fn());
const updatePlayerNameMock = vi.hoisted(() => vi.fn());

vi.mock('../../src/state/sessionSdk', async () => {
	const actual = await vi.importActual('../../src/state/sessionSdk');
	return {
		...(actual as Record<string, unknown>),
		createSession: createSessionMock,
		fetchSnapshot: fetchSnapshotMock,
		releaseSession: releaseSessionMock,
		setSessionDevMode: setSessionDevModeMock,
		updatePlayerName: updatePlayerNameMock,
	};
});

const runUntilActionPhaseMock = vi.hoisted(() => vi.fn());
const runUntilActionPhaseCoreMock = vi.hoisted(() => vi.fn());
const handleEndTurnMock = vi.hoisted(() => vi.fn());
const addResolutionLogMock = vi.hoisted(() => vi.fn());
const startSessionMock = vi.hoisted(() => vi.fn());
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
		addResolutionLog: addResolutionLogMock,
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
				activePlayerId: 'player-main',
				activePlayerName: 'Player Main',
				awaitingManualStart: false,
			},
			runUntilActionPhase: runUntilActionPhaseMock,
			runUntilActionPhaseCore: runUntilActionPhaseCoreMock,
			handleEndTurn: handleEndTurnMock,
			endTurn: vi.fn(),
			applyPhaseSnapshot: vi.fn(),
			refreshPhaseState: vi.fn(),
			startSession: startSessionMock,
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
	const { sessionSnapshot } = useGameEngine();
	return <div data-testid="session-turn">turn:{sessionSnapshot.game.turn}</div>;
}

describe('GameProvider', () => {
	let session: SessionAdapter;
	let registriesPayload: ReturnType<typeof createSessionRegistriesPayload>;
	let initialSnapshot: ReturnType<typeof createSessionSnapshot>;
	let refreshedSnapshot: ReturnType<typeof createSessionSnapshot>;
	let sessionHarness: RemoteSessionAdapterHarness | null;
	const sessionId = 'session-1';
	beforeEach(() => {
		clearSessionStateStore();
		sessionHarness = null;
		createSessionMock.mockReset();
		fetchSnapshotMock.mockReset();
		releaseSessionMock.mockReset();
		setSessionDevModeMock.mockReset();
		updatePlayerNameMock.mockReset();
		runUntilActionPhaseMock.mockReset();
		runUntilActionPhaseCoreMock.mockReset();
		handleEndTurnMock.mockReset();
		addResolutionLogMock.mockReset();
		pushToastMock.mockReset();
		pushErrorToastMock.mockReset();
		pushSuccessToastMock.mockReset();
		dismissToastMock.mockReset();
		showResolutionMock.mockReset();
		acknowledgeResolutionMock.mockReset();
		handlePerformMock.mockReset();
		startSessionMock.mockReset();
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
			id: 'A',
			name: 'Commander',
			resources: { [resourceKey]: 10 },
		});
		const opponent = createSnapshotPlayer({
			id: 'B',
			name: 'Rival',
			resources: { [resourceKey]: 6 },
		});
		initialSnapshot = createSessionSnapshot({
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
		refreshedSnapshot = createSessionSnapshot({
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
		registriesPayload = createSessionRegistriesPayload();
		updatePlayerNameMock.mockImplementation(() => {
			const response: SessionStateResponse = {
				sessionId,
				snapshot: initialSnapshot,
				registries: registriesPayload,
			};
			const stateRecord = applySessionState(response);
			return Promise.resolve({
				sessionId,
				snapshot: stateRecord.snapshot,
				registries: stateRecord.registries,
			});
		});
		createSessionMock.mockImplementation(() => {
			const response: SessionCreateResponse = {
				sessionId,
				snapshot: initialSnapshot,
				registries: registriesPayload,
			};
			sessionHarness = createRemoteSessionAdapter({
				sessionId,
				snapshot: response.snapshot,
				registries: response.registries,
			});
			session = sessionHarness.adapter;
			return Promise.resolve({
				sessionId,
				adapter: session,
				record: sessionHarness.record,
			});
		});
		fetchSnapshotMock.mockImplementation(() => {
			if (!sessionHarness) {
				throw new Error('Session harness not initialised');
			}
			const response: SessionStateResponse = {
				sessionId,
				snapshot: refreshedSnapshot,
				registries: registriesPayload,
			};
			const stateRecord = applySessionState(response);
			return Promise.resolve({
				sessionId,
				adapter: session,
				record: {
					sessionId: stateRecord.sessionId,
					snapshot: stateRecord.snapshot,
					ruleSnapshot: stateRecord.ruleSnapshot,
					registries: stateRecord.registries,
					resourceKeys: stateRecord.resourceKeys,
					metadata: stateRecord.metadata,
					queueSeed: stateRecord.queueSeed,
				},
			});
		});
	});

	afterEach(() => {
		cleanup();
		if (sessionHarness) {
			sessionHarness.cleanup();
			sessionHarness = null;
		}
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

	it('persists resume metadata when snapshots are stored', async () => {
		let currentTime = new Date('2024-01-01T00:00:00.000Z').getTime();
		const nowSpy = vi.spyOn(Date, 'now').mockImplementation(() => currentTime);
		const persistResumeSession = vi.fn();

		try {
			render(
				<GameProvider
					playerName="Commander"
					onPersistResumeSession={persistResumeSession}
				>
					<SessionInspector />
				</GameProvider>,
			);

			await waitFor(() =>
				expect(persistResumeSession).toHaveBeenCalledTimes(1),
			);

			const firstRecord = persistResumeSession.mock.calls[0]?.[0] ?? null;
			expect(firstRecord).toMatchObject({
				sessionId,
				turn: 1,
				devMode: initialSnapshot.game.devMode ?? false,
			});
			expect(typeof firstRecord?.updatedAt).toBe('number');
			expect(firstRecord?.updatedAt).toBe(currentTime);

			currentTime = new Date('2024-01-01T00:05:00.000Z').getTime();
			const devModeSnapshot = createSessionSnapshot({
				players: initialSnapshot.game.players,
				activePlayerId: initialSnapshot.game.activePlayerId,
				opponentId: initialSnapshot.game.opponentId,
				phases: initialSnapshot.phases,
				actionCostResource: initialSnapshot.actionCostResource,
				ruleSnapshot: initialSnapshot.rules,
				turn: 2,
				devMode: true,
				currentPhase: initialSnapshot.game.currentPhase,
				currentStep: initialSnapshot.game.currentStep,
			});
			fetchSnapshotMock.mockImplementationOnce(() => {
				if (!sessionHarness) {
					throw new Error('Session harness not initialised');
				}
				const response: SessionStateResponse = {
					sessionId,
					snapshot: devModeSnapshot,
					registries: registriesPayload,
				};
				const stateRecord = applySessionState(response);
				return Promise.resolve({
					sessionId,
					adapter: session,
					record: {
						sessionId: stateRecord.sessionId,
						snapshot: stateRecord.snapshot,
						ruleSnapshot: stateRecord.ruleSnapshot,
						registries: stateRecord.registries,
						resourceKeys: stateRecord.resourceKeys,
						metadata: stateRecord.metadata,
						queueSeed: stateRecord.queueSeed,
					},
				});
			});

			if (capturedPhaseOptions?.refresh) {
				await act(() => Promise.resolve(capturedPhaseOptions.refresh()));
			}

			await waitFor(() =>
				expect(persistResumeSession).toHaveBeenCalledTimes(2),
			);

			const secondRecord = persistResumeSession.mock.calls[1]?.[0] ?? null;
			expect(secondRecord).toMatchObject({
				sessionId,
				turn: 2,
				devMode: true,
			});
			expect(secondRecord?.updatedAt).toBe(currentTime);
		} finally {
			nowSpy.mockRestore();
		}
	});

	it('fetches snapshots when a resume session id is provided', async () => {
		if (!sessionHarness) {
			sessionHarness = createRemoteSessionAdapter({
				sessionId,
				snapshot: refreshedSnapshot,
				registries: registriesPayload,
			});
			session = sessionHarness.adapter;
		}
		render(
			<GameProvider playerName="Commander" resumeSessionId={sessionId}>
				<SessionInspector />
			</GameProvider>,
		);

		await waitFor(() =>
			expect(screen.getByTestId('session-turn')).toHaveTextContent('turn:2'),
		);

		expect(createSessionMock).not.toHaveBeenCalled();
		expect(fetchSnapshotMock).toHaveBeenCalledWith(
			sessionId,
			expect.objectContaining({ signal: expect.any(AbortSignal) }),
		);
	});

	it('routes resume bootstrap failures through callbacks', async () => {
		const resumeError = new Error('resume failed');
		fetchSnapshotMock.mockRejectedValueOnce(resumeError);
		const handleResumeFailure = vi.fn();
		const clearResumeSession = vi.fn();

		render(
			<GameProvider
				playerName="Commander"
				resumeSessionId={sessionId}
				onResumeSessionFailure={handleResumeFailure}
				onClearResumeSession={clearResumeSession}
			>
				<SessionInspector />
			</GameProvider>,
		);

		await waitFor(() =>
			expect(handleResumeFailure).toHaveBeenCalledWith({
				sessionId,
				error: resumeError,
			}),
		);
		expect(clearResumeSession).toHaveBeenCalledWith(sessionId);
		expect(createSessionMock).not.toHaveBeenCalled();
	});

	it('exposes gameplay preference props through the game context', async () => {
		const handleToggleAutoAdvance = vi.fn();
		const capture = vi.fn();

		function PreferenceSpy() {
			const { autoAdvanceEnabled, onToggleAutoAdvance } = useGameEngine();
			React.useEffect(() => {
				capture({
					autoAdvanceEnabled,
					onToggleAutoAdvance,
				});
			}, [autoAdvanceEnabled, onToggleAutoAdvance]);
			return null;
		}

		render(
			<GameProvider
				playerName="Commander"
				autoAdvanceEnabled
				onToggleAutoAdvance={handleToggleAutoAdvance}
			>
				<PreferenceSpy />
			</GameProvider>,
		);

		await waitFor(() => expect(capture).toHaveBeenCalled());

		const lastCall = capture.mock.calls[capture.mock.calls.length - 1]?.[0];
		expect(lastCall?.autoAdvanceEnabled).toBe(true);
		act(() => {
			lastCall?.onToggleAutoAdvance();
		});
		expect(handleToggleAutoAdvance).toHaveBeenCalledTimes(1);
	});

	it('updates the active session when the dev mode prop changes', async () => {
		const { rerender } = render(
			<GameProvider devMode={false} playerName="Scout">
				<SessionInspector />
			</GameProvider>,
		);

		await waitFor(() =>
			expect(screen.getByTestId('session-turn')).toHaveTextContent('turn:1'),
		);

		expect(setSessionDevModeMock).not.toHaveBeenCalled();

		const devModeSnapshot = createSessionSnapshot({
			players: initialSnapshot.game.players,
			activePlayerId: initialSnapshot.game.activePlayerId,
			opponentId: initialSnapshot.game.opponentId,
			phases: initialSnapshot.phases,
			actionCostResource: initialSnapshot.actionCostResource,
			ruleSnapshot: initialSnapshot.rules,
			turn: 3,
			devMode: true,
		});
		setSessionDevModeMock.mockImplementationOnce(() => {
			const response: SessionStateResponse = {
				sessionId,
				snapshot: devModeSnapshot,
				registries: registriesPayload,
			};
			const stateRecord = applySessionState(response);
			return Promise.resolve({
				sessionId,
				adapter: session,
				record: {
					sessionId: stateRecord.sessionId,
					snapshot: stateRecord.snapshot,
					ruleSnapshot: stateRecord.ruleSnapshot,
					registries: stateRecord.registries,
					resourceKeys: stateRecord.resourceKeys,
					metadata: stateRecord.metadata,
					queueSeed: stateRecord.queueSeed,
				},
			});
		});

		rerender(
			<GameProvider devMode playerName="Scout">
				<SessionInspector />
			</GameProvider>,
		);

		await waitFor(() =>
			expect(setSessionDevModeMock).toHaveBeenCalledWith('session-1', true),
		);

		await waitFor(() =>
			expect(screen.getByTestId('session-turn')).toHaveTextContent('turn:3'),
		);
	});

	it('ignores stale refresh results that resolve after a dev mode update', async () => {
		const { rerender } = render(
			<GameProvider devMode={false} playerName="Scout">
				<SessionInspector />
			</GameProvider>,
		);

		await waitFor(() =>
			expect(screen.getByTestId('session-turn')).toHaveTextContent('turn:1'),
		);

		const devModeSnapshot = createSessionSnapshot({
			players: initialSnapshot.game.players,
			activePlayerId: initialSnapshot.game.activePlayerId,
			opponentId: initialSnapshot.game.opponentId,
			phases: initialSnapshot.phases,
			actionCostResource: initialSnapshot.actionCostResource,
			ruleSnapshot: initialSnapshot.rules,
			turn: 3,
			devMode: true,
		});
		setSessionDevModeMock.mockImplementationOnce(() => {
			const response: SessionStateResponse = {
				sessionId,
				snapshot: devModeSnapshot,
				registries: registriesPayload,
			};
			const stateRecord = applySessionState(response);
			return Promise.resolve({
				sessionId,
				adapter: session,
				record: {
					sessionId: stateRecord.sessionId,
					snapshot: stateRecord.snapshot,
					ruleSnapshot: stateRecord.ruleSnapshot,
					registries: stateRecord.registries,
					resourceKeys: stateRecord.resourceKeys,
					metadata: stateRecord.metadata,
					queueSeed: stateRecord.queueSeed,
				},
			});
		});

		rerender(
			<GameProvider devMode playerName="Scout">
				<SessionInspector />
			</GameProvider>,
		);

		await waitFor(() =>
			expect(setSessionDevModeMock).toHaveBeenCalledWith('session-1', true),
		);

		await waitFor(() =>
			expect(screen.getByTestId('session-turn')).toHaveTextContent('turn:3'),
		);

		const initialFetchCount = fetchSnapshotMock.mock.calls.length;

		await act(() => {
			capturedPhaseOptions?.refresh?.();
			return waitFor(() =>
				expect(fetchSnapshotMock).toHaveBeenCalledTimes(initialFetchCount + 1),
			);
		});

		await waitFor(() =>
			expect(screen.getByTestId('session-turn')).toHaveTextContent('turn:3'),
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

	it('aborts an in-flight refresh when another refresh begins', async () => {
		render(
			<GameProvider devMode playerName="Commander">
				<SessionInspector />
			</GameProvider>,
		);

		await waitFor(() =>
			expect(screen.getByTestId('session-turn')).toHaveTextContent('turn:1'),
		);

		expect(capturedPhaseOptions?.refresh).toBeTypeOf('function');

		let abortResolve: (() => void) | undefined;
		const abortNotified = new Promise<void>((resolve) => {
			abortResolve = resolve;
		});

		let firstSignal: AbortSignal | undefined;
		fetchSnapshotMock.mockImplementationOnce((sessionId, options) => {
			expect(sessionId).toBe('session-1');
			firstSignal = options?.signal as AbortSignal | undefined;
			return new Promise((_resolve, reject) => {
				if (!firstSignal) {
					reject(new Error('missing abort signal'));
					return;
				}
				const handleAbort = () => {
					const abortError = new Error('aborted');
					abortError.name = 'AbortError';
					abortResolve?.();
					reject(abortError);
				};
				firstSignal.addEventListener('abort', handleAbort, {
					once: true,
				});
			});
		});

		act(() => {
			capturedPhaseOptions?.refresh?.();
		});

		await waitFor(() => expect(fetchSnapshotMock).toHaveBeenCalledTimes(1));

		act(() => {
			capturedPhaseOptions?.refresh?.();
		});

		await abortNotified;

		expect(firstSignal?.aborted).toBe(true);

		await waitFor(() => expect(fetchSnapshotMock).toHaveBeenCalledTimes(2));

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

	it('shows bootstrap diagnostics when session creation fails', async () => {
		const fatalError = new Error('session creation failed');
		createSessionMock.mockRejectedValueOnce(fatalError);

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

		expect(
			screen.getByText('An unexpected error prevented the game from loading.'),
		).toBeInTheDocument();

		expect(
			screen.getByText(/"message": "session creation failed"/),
		).toBeInTheDocument();

		expect(releaseSessionMock).not.toHaveBeenCalled();
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

	it('releases the session and shows bootstrap screen when mirroring fails', async () => {
		render(
			<GameProvider playerName="Commander">
				<SessionInspector />
			</GameProvider>,
		);

		await waitFor(() =>
			expect(screen.getByTestId('session-turn')).toHaveTextContent('turn:1'),
		);

		const fatalError = new SessionMirroringError('Mirroring failed', {
			cause: new Error('desync'),
		});

		await act(async () => {
			capturedPhaseOptions?.onFatalSessionError?.(fatalError);
			await Promise.resolve();
		});

		await waitFor(() =>
			expect(releaseSessionMock).toHaveBeenCalledWith('session-1'),
		);

		await waitFor(() =>
			expect(
				screen.getByText('We could not load your kingdom.'),
			).toBeInTheDocument(),
		);
	});

	it('shows bootstrap diagnostics when a refresh fails', async () => {
		render(
			<GameProvider playerName="Commander">
				<SessionInspector />
			</GameProvider>,
		);

		await waitFor(() =>
			expect(screen.getByTestId('session-turn')).toHaveTextContent('turn:1'),
		);

		const fatalError = new Error('snapshot refresh failed');
		fetchSnapshotMock.mockRejectedValueOnce(fatalError);

		await act(async () => {
			capturedPhaseOptions?.refresh?.();
			await Promise.resolve();
		});

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

		expect(
			screen.getByText(/"message": "snapshot refresh failed"/),
		).toBeInTheDocument();
	});
});
