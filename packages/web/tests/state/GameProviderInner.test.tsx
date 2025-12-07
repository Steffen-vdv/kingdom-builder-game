/** @vitest-environment jsdom */
import React from 'react';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import type { SessionSnapshot } from '@kingdom-builder/protocol/session';
import type { ActionResolution } from '../../src/state/useActionResolution';
import type { PhaseProgressState } from '../../src/state/usePhaseProgress';
import {
	GameProviderInner,
	GameEngineContext,
} from '../../src/state/GameProviderInner';
import {
	createSessionSnapshot,
	createSnapshotPlayer,
} from '../helpers/sessionFixtures';
import {
	createSessionRegistries,
	createSessionRegistriesPayload,
	createResourceKeys,
} from '../helpers/sessionRegistries';
import { createRemoteSessionAdapter } from '../helpers/remoteSessionAdapter';
import { clearSessionStateStore } from '../../src/state/sessionStateStore';
import type { TranslationContext } from '../../src/translation/context';
import { updatePlayerName as updateRemotePlayerName } from '../../src/state/sessionSdk';
import ResourceButton from '../../src/components/player/ResourceButton';

const runUntilActionPhaseMock = vi.fn(() => Promise.resolve());
const runUntilActionPhaseCoreMock = vi.fn(() => Promise.resolve());
const handleEndTurnMock = vi.fn();
const applyPhaseSnapshotMock = vi.fn();
const refreshPhaseStateMock = vi.fn();
const startSessionMock = vi.fn(() => Promise.resolve());
const handlePerformMock = vi.fn();
const useSessionQueueMock = vi.fn();
const showResolutionMock = vi.fn();
const acknowledgeResolutionMock = vi.fn();
let mockResolution: ActionResolution | null = null;
let mockPhaseState: PhaseProgressState;
let capturedPhaseOptions: Record<string, unknown> | null = null;
let capturedPerformerOptions: Record<string, unknown> | null = null;
let capturedAiOptions: Record<string, unknown> | null = null;
const addResolutionLogMock = vi.fn();
let capturedLoggerOptions: Record<string, unknown> | null = null;
let capturedTranslationOptions: Record<string, unknown> | null = null;

vi.mock('../../src/state/useSessionQueue', () => ({
	useSessionQueue: (...args: unknown[]) => useSessionQueueMock(...args),
}));

vi.mock('../../src/state/useTimeScale', () => ({
	useTimeScale: () => ({
		timeScale: 1,
		setTimeScale: vi.fn(),
		clearTrackedTimeout: vi.fn(),
		setTrackedTimeout: vi.fn(),
		isMountedRef: { current: true },
		timeScaleRef: { current: 1 },
	}),
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
}));

vi.mock('../../src/state/useActionResolution', () => ({
	useActionResolution: () => ({
		resolution: mockResolution,
		showResolution: showResolutionMock,
		acknowledgeResolution: acknowledgeResolutionMock,
	}),
}));

vi.mock('../../src/state/usePhaseProgress', () => ({
	usePhaseProgress: (options: Record<string, unknown>) => {
		capturedPhaseOptions = options;
		const { onSnapshotApplied } = options as {
			onSnapshotApplied?: (snapshot: SessionSnapshot) => void;
		};
		const applyPhaseSnapshot = (
			snapshot: SessionSnapshot,
			overrides?: Partial<PhaseProgressState>,
		) => {
			applyPhaseSnapshotMock(snapshot, overrides);
			if (onSnapshotApplied) {
				onSnapshotApplied(snapshot);
			}
		};
		return {
			phase: mockPhaseState,
			initializing: false,
			runUntilActionPhase: runUntilActionPhaseMock,
			runUntilActionPhaseCore: runUntilActionPhaseCoreMock,
			handleEndTurn: handleEndTurnMock,
			endTurn: vi.fn(),
			applyPhaseSnapshot,
			refreshPhaseState: refreshPhaseStateMock,
			startSession: startSessionMock,
		};
	},
}));

vi.mock('../../src/state/useActionPerformer', () => ({
	useActionPerformer: (options: Record<string, unknown>) => {
		capturedPerformerOptions = options;
		return { handlePerform: handlePerformMock };
	},
}));

vi.mock('../../src/state/useAiRunner', () => ({
	useAiRunner: (options: Record<string, unknown>) => {
		capturedAiOptions = options;
	},
}));

vi.mock('../../src/state/useCompensationLogger', () => ({
	useCompensationLogger: (options: Record<string, unknown>) => {
		capturedLoggerOptions = options;
	},
}));

vi.mock('../../src/state/useSessionTranslationContext', () => ({
	useSessionTranslationContext: (options: Record<string, unknown>) => {
		capturedTranslationOptions = options;
		const translationContext = {} as TranslationContext;
		return { translationContext, isReady: true };
	},
}));

vi.mock('../../src/state/sessionSdk', () => ({
	updatePlayerName: vi.fn(() => Promise.resolve()),
}));

function createResolutionState({
	requireAcknowledgement,
	isComplete,
}: {
	requireAcknowledgement: boolean;
	isComplete: boolean;
}): ActionResolution {
	return {
		lines: ['Event resolved'],
		visibleLines: ['Event resolved'],
		timeline: [],
		visibleTimeline: [],
		isComplete,
		summaries: [],
		source: 'action',
		requireAcknowledgement,
	};
}

describe('GameProviderInner', () => {
	const sessionId = 'session:test';
	let sessionState: SessionSnapshot;
	let localPlayer: ReturnType<typeof createSnapshotPlayer>;
	let aiOpponent: ReturnType<typeof createSnapshotPlayer>;
	const registries = createSessionRegistries();
	const resourceKeys = createResourceKeys();

	beforeEach(() => {
		clearSessionStateStore();
		capturedPhaseOptions = null;
		capturedPerformerOptions = null;
		capturedAiOptions = null;
		capturedLoggerOptions = null;
		capturedTranslationOptions = null;
		runUntilActionPhaseMock.mockClear();
		runUntilActionPhaseCoreMock.mockClear();
		handleEndTurnMock.mockClear();
		applyPhaseSnapshotMock.mockClear();
		refreshPhaseStateMock.mockClear();
		startSessionMock.mockClear();
		handlePerformMock.mockClear();
		useSessionQueueMock.mockReset();
		vi.mocked(updateRemotePlayerName).mockClear();
		addResolutionLogMock.mockClear();
		showResolutionMock.mockClear();
		acknowledgeResolutionMock.mockClear();
		mockResolution = null;
		const phases = [
			{ id: 'phase:test', action: true, steps: [{ id: 'phase:test:start' }] },
		];
		localPlayer = createSnapshotPlayer({ id: 'A', name: 'Player A' });
		aiOpponent = createSnapshotPlayer({
			id: 'B',
			name: 'Player B',
			aiControlled: true,
		});
		sessionState = createSessionSnapshot({
			players: [aiOpponent, localPlayer],
			activePlayerId: aiOpponent.id,
			opponentId: localPlayer.id,
			phases,
			actionCostResource: 'ap',
			ruleSnapshot: {
				tieredResourceKey: 'ap',
				tierDefinitions: [],
				winConditions: [],
			},
		});
		mockPhaseState = {
			currentPhaseId: sessionState.game.currentPhase,
			isActionPhase: true,
			canEndTurn: true,
			isAdvancing: false,
			activePlayerId: sessionState.game.activePlayerId,
			activePlayerName:
				sessionState.game.players.find((player) => {
					return player.id === sessionState.game.activePlayerId;
				})?.name ?? null,
			turnNumber: sessionState.game.turn,
			awaitingManualStart: false,
		};
	});

	it('routes the remote adapter through session queue helpers', () => {
		const registriesPayload = createSessionRegistriesPayload();
		const { adapter, cleanup } = createRemoteSessionAdapter({
			sessionId,
			snapshot: sessionState,
			registries: registriesPayload,
		});
		const enqueue = vi.fn(
			async <T,>(task: () => Promise<T> | T) => await task(),
		);
		useSessionQueueMock.mockReturnValue({
			enqueue,
			cachedSessionSnapshot: sessionState,
		});

		const queueHelpers = {
			enqueue: vi.fn(),
			getCurrentSession: () => adapter,
			getLatestSnapshot: () => null,
		};

		render(
			<GameProviderInner
				darkMode
				onToggleDark={() => {}}
				devMode={false}
				musicEnabled
				onToggleMusic={() => {}}
				soundEnabled
				onToggleSound={() => {}}
				backgroundAudioMuted
				onToggleBackgroundAudioMute={() => {}}
				autoAdvanceEnabled
				onToggleAutoAdvance={() => {}}
				playerName={localPlayer.name}
				onChangePlayerName={() => {}}
				queue={queueHelpers}
				sessionId={sessionId}
				sessionSnapshot={sessionState}
				ruleSnapshot={sessionState.rules}
				refreshSession={async () => {}}
				onReleaseSession={() => {}}
				registries={registries}
				resourceKeys={resourceKeys}
				sessionMetadata={sessionState.metadata}
			>
				<div />
			</GameProviderInner>,
		);

		expect(useSessionQueueMock).toHaveBeenCalledWith(
			queueHelpers,
			sessionState,
			sessionId,
		);
		expect(capturedPerformerOptions).not.toHaveProperty('session');
		expect(capturedPerformerOptions?.sessionId).toBe(sessionId);
		expect(capturedAiOptions?.sessionId).toBe(sessionId);
		expect(typeof capturedAiOptions?.showResolution).toBe('function');
		expect(capturedAiOptions?.addResolutionLog).toBe(addResolutionLogMock);
		expect(capturedAiOptions?.registries).toBe(registries);
		expect(capturedAiOptions?.resourceKeys).toBe(resourceKeys);
		expect(capturedAiOptions?.actionCostResource).toBe(
			sessionState.actionCostResource,
		);
		expect(capturedPhaseOptions?.enqueue).toBe(enqueue);
		expect(typeof capturedPhaseOptions?.onSnapshotApplied).toBe('function');
		expect(capturedLoggerOptions?.sessionId).toBe(sessionId);
		expect(capturedTranslationOptions?.sessionSnapshot).toBe(sessionState);
		expect(capturedTranslationOptions?.sessionMetadata).toBe(
			sessionState.metadata,
		);
		expect(capturedTranslationOptions).not.toHaveProperty(
			'cachedSessionSnapshot',
		);
		cleanup();
	});

	it('stores gameplay preference props in the engine context', async () => {
		const registriesPayload = createSessionRegistriesPayload();
		const { adapter, cleanup } = createRemoteSessionAdapter({
			sessionId,
			snapshot: sessionState,
			registries: registriesPayload,
		});
		const enqueue = vi.fn(
			async <T,>(task: () => Promise<T> | T) => await task(),
		);
		useSessionQueueMock.mockReturnValue({
			enqueue,
			cachedSessionSnapshot: sessionState,
		});

		const queueHelpers = {
			enqueue: vi.fn(),
			getCurrentSession: () => adapter,
			getLatestSnapshot: () => null,
		};
		const toggleAutoAdvance = vi.fn();
		const captured: Array<{
			autoAdvanceEnabled: boolean;
			onToggleAutoAdvance: () => void;
		}> = [];

		function PreferenceConsumer() {
			const value = React.useContext(GameEngineContext);
			React.useEffect(() => {
				if (!value) {
					return;
				}
				captured.push({
					autoAdvanceEnabled: value.autoAdvanceEnabled,
					onToggleAutoAdvance: value.onToggleAutoAdvance,
				});
			}, [value]);
			return null;
		}

		render(
			<GameProviderInner
				darkMode
				onToggleDark={() => {}}
				devMode={false}
				musicEnabled
				onToggleMusic={() => {}}
				soundEnabled
				onToggleSound={() => {}}
				backgroundAudioMuted
				onToggleBackgroundAudioMute={() => {}}
				autoAdvanceEnabled
				onToggleAutoAdvance={toggleAutoAdvance}
				playerName={localPlayer.name}
				onChangePlayerName={() => {}}
				queue={queueHelpers}
				sessionId={sessionId}
				sessionSnapshot={sessionState}
				ruleSnapshot={sessionState.rules}
				refreshSession={async () => {}}
				onReleaseSession={() => {}}
				registries={registries}
				resourceKeys={resourceKeys}
				sessionMetadata={sessionState.metadata}
			>
				<PreferenceConsumer />
			</GameProviderInner>,
		);

		await waitFor(() => {
			expect(captured.length).toBeGreaterThan(0);
		});

		const latest = captured[captured.length - 1];
		expect(latest.autoAdvanceEnabled).toBe(true);
		act(() => {
			latest.onToggleAutoAdvance();
		});
		expect(toggleAutoAdvance).toHaveBeenCalledTimes(1);
		cleanup();
	});

	it('clears resume state before releasing the session on exit', async () => {
		const registriesPayload = createSessionRegistriesPayload();
		const { adapter, cleanup } = createRemoteSessionAdapter({
			sessionId,
			snapshot: sessionState,
			registries: registriesPayload,
		});
		const enqueue = vi.fn(
			async <T,>(task: () => Promise<T> | T) => await task(),
		);
		useSessionQueueMock.mockReturnValue({
			enqueue,
			cachedSessionSnapshot: sessionState,
		});

		const queueHelpers = {
			enqueue: vi.fn(),
			getCurrentSession: () => adapter,
			getLatestSnapshot: () => null,
		};
		const handleExit = vi.fn();
		const handleReleaseSession = vi.fn();
		const handleAbandonSession = vi.fn();

		function ExitTrigger() {
			const value = React.useContext(GameEngineContext);
			React.useEffect(() => {
				if (!value?.onExit) {
					return;
				}
				value.onExit();
			}, [value]);
			return null;
		}

		render(
			<GameProviderInner
				darkMode
				onToggleDark={() => {}}
				devMode={false}
				musicEnabled
				onToggleMusic={() => {}}
				soundEnabled
				onToggleSound={() => {}}
				backgroundAudioMuted
				onToggleBackgroundAudioMute={() => {}}
				autoAdvanceEnabled={false}
				onToggleAutoAdvance={() => {}}
				playerName={localPlayer.name}
				onChangePlayerName={() => {}}
				queue={queueHelpers}
				sessionId={sessionId}
				sessionSnapshot={sessionState}
				ruleSnapshot={sessionState.rules}
				refreshSession={async () => {}}
				onExit={handleExit}
				onReleaseSession={handleReleaseSession}
				onAbandonSession={handleAbandonSession}
				registries={registries}
				resourceKeys={resourceKeys}
				sessionMetadata={sessionState.metadata}
			>
				<ExitTrigger />
			</GameProviderInner>,
		);

		await waitFor(() => expect(handleExit).toHaveBeenCalledTimes(1));

		expect(handleAbandonSession).toHaveBeenCalledTimes(1);
		expect(handleReleaseSession).toHaveBeenCalledTimes(1);
		const abandonOrder = handleAbandonSession.mock.invocationCallOrder[0];
		const releaseOrder = handleReleaseSession.mock.invocationCallOrder[0];
		expect(abandonOrder).toBeLessThan(releaseOrder);
		cleanup();
	});

	it('propagates live session snapshots to resource change indicators', async () => {
		const resourceKey = sessionState.actionCostResource;
		const basePlayer = createSnapshotPlayer({
			id: 'player-live',
			name: 'Live Player',
			valuesV2: { [resourceKey]: 4 },
		});
		const opponentPlayer = createSnapshotPlayer({
			id: 'player-opponent',
			name: 'Opponent Player',
		});
		const phases = sessionState.phases;
		const ruleSnapshot = sessionState.rules;
		const metadata = sessionState.metadata;
		const baseSnapshot = createSessionSnapshot({
			players: [basePlayer, opponentPlayer],
			activePlayerId: basePlayer.id,
			opponentId: opponentPlayer.id,
			phases,
			actionCostResource: resourceKey,
			ruleSnapshot,
			metadata,
		});
		const increasedPlayer = createSnapshotPlayer({
			id: basePlayer.id,
			name: basePlayer.name,
			valuesV2: {
				...basePlayer.valuesV2,
				[resourceKey]: (basePlayer.valuesV2[resourceKey] ?? 0) + 2,
			},
		});
		const increasedSnapshot = createSessionSnapshot({
			players: [increasedPlayer, opponentPlayer],
			activePlayerId: basePlayer.id,
			opponentId: opponentPlayer.id,
			phases,
			actionCostResource: resourceKey,
			ruleSnapshot,
			metadata,
		});
		const restoredPlayer = createSnapshotPlayer({
			id: basePlayer.id,
			name: basePlayer.name,
			valuesV2: basePlayer.valuesV2,
		});
		const restoredSnapshot = createSessionSnapshot({
			players: [restoredPlayer, opponentPlayer],
			activePlayerId: basePlayer.id,
			opponentId: opponentPlayer.id,
			phases,
			actionCostResource: resourceKey,
			ruleSnapshot,
			metadata,
		});
		mockPhaseState = {
			currentPhaseId: baseSnapshot.game.currentPhase,
			isActionPhase: true,
			canEndTurn: true,
			isAdvancing: false,
			activePlayerId: basePlayer.id,
			activePlayerName: basePlayer.name,
			turnNumber: baseSnapshot.game.turn,
			awaitingManualStart: false,
		};
		const enqueue = vi.fn(
			async <T,>(task: () => Promise<T> | T) => await task(),
		);
		useSessionQueueMock.mockReturnValue({
			enqueue,
			cachedSessionSnapshot: baseSnapshot,
		});

		const queueHelpers = {
			enqueue: vi.fn(),
			getCurrentSession: () => ({}) as never,
			getLatestSnapshot: () => null,
		};

		function ResourceButtonHarness() {
			const value = React.useContext(GameEngineContext);
			if (!value) {
				return null;
			}
			const activePlayer = value.sessionSnapshot.game.players.find(
				(player) => player.id === value.sessionSnapshot.game.activePlayerId,
			);
			if (!activePlayer) {
				return null;
			}
			const resourceValue = activePlayer.valuesV2[resourceKey] ?? 0;
			return (
				<ResourceButton
					metadata={{
						id: resourceKey,
						label: 'Test Resource',
						icon: 'Ⓡ',
					}}
					snapshot={{
						id: resourceKey,
						current: resourceValue,
					}}
					onShow={() => {}}
					onHide={() => {}}
				/>
			);
		}

		render(
			<GameProviderInner
				darkMode
				onToggleDark={() => {}}
				devMode={false}
				musicEnabled
				onToggleMusic={() => {}}
				soundEnabled
				onToggleSound={() => {}}
				backgroundAudioMuted
				onToggleBackgroundAudioMute={() => {}}
				autoAdvanceEnabled={false}
				onToggleAutoAdvance={() => {}}
				playerName={basePlayer.name}
				onChangePlayerName={() => {}}
				queue={queueHelpers}
				sessionId={sessionId}
				sessionSnapshot={baseSnapshot}
				ruleSnapshot={ruleSnapshot}
				refreshSession={async () => {}}
				onReleaseSession={() => {}}
				registries={registries}
				resourceKeys={resourceKeys}
				sessionMetadata={metadata}
			>
				<ResourceButtonHarness />
			</GameProviderInner>,
		);

		await screen.findByRole('button', {
			name: 'Test Resource: 4',
		});

		const syncPhaseState = capturedPerformerOptions?.syncPhaseState as
			| ((snapshot: SessionSnapshot) => void)
			| undefined;
		expect(syncPhaseState).toBeTypeOf('function');

		act(() => {
			syncPhaseState?.(increasedSnapshot);
		});

		const increasedButton = await screen.findByRole('button', {
			name: 'Test Resource: 6',
		});
		expect(within(increasedButton).getByText('+2')).toBeInTheDocument();

		act(() => {
			syncPhaseState?.(restoredSnapshot);
		});

		await waitFor(() => {
			const resourceButton = screen.getByRole('button', {
				name: 'Test Resource: 4',
			});
			expect(within(resourceButton).getByText('+2')).toBeInTheDocument();
			expect(within(resourceButton).getByText('-2')).toBeInTheDocument();
		});
	});
	it('updates the human-controlled player name even when listed after AI opponents', async () => {
		const registriesPayload = createSessionRegistriesPayload();
		const { adapter, cleanup } = createRemoteSessionAdapter({
			sessionId,
			snapshot: sessionState,
			registries: registriesPayload,
		});
		const enqueue = vi.fn(
			async <T,>(task: () => Promise<T> | T) => await task(),
		);
		const refreshSession = vi.fn(async () => {});
		let currentSnapshot = sessionState;
		useSessionQueueMock.mockImplementation(() => ({
			enqueue,
			cachedSessionSnapshot: currentSnapshot,
		}));

		const queueHelpers = {
			enqueue: vi.fn(),
			getCurrentSession: () => adapter,
			getLatestSnapshot: () => null,
		};
		const { rerender } = render(
			<GameProviderInner
				darkMode
				onToggleDark={() => {}}
				devMode={false}
				musicEnabled
				onToggleMusic={() => {}}
				soundEnabled
				onToggleSound={() => {}}
				backgroundAudioMuted
				onToggleBackgroundAudioMute={() => {}}
				autoAdvanceEnabled
				onToggleAutoAdvance={() => {}}
				playerName="Strategist"
				onChangePlayerName={() => {}}
				queue={queueHelpers}
				sessionId={sessionId}
				sessionSnapshot={sessionState}
				ruleSnapshot={sessionState.rules}
				refreshSession={refreshSession}
				onReleaseSession={() => {}}
				registries={registries}
				resourceKeys={resourceKeys}
				sessionMetadata={sessionState.metadata}
			>
				<div />
			</GameProviderInner>,
		);

		await waitFor(() => {
			expect(updateRemotePlayerName).toHaveBeenCalledWith({
				sessionId,
				playerId: localPlayer.id,
				playerName: 'Strategist',
			});
		});
		await waitFor(() => {
			expect(refreshSession).toHaveBeenCalled();
		});

		const updatedLocal = createSnapshotPlayer({
			id: localPlayer.id,
			name: 'Strategist',
		});
		currentSnapshot = createSessionSnapshot({
			players: [aiOpponent, updatedLocal],
			activePlayerId: aiOpponent.id,
			opponentId: updatedLocal.id,
			phases: sessionState.phases,
			actionCostResource: sessionState.actionCostResource,
			ruleSnapshot: sessionState.rules,
		});
		useSessionQueueMock.mockImplementation(() => ({
			enqueue,
			cachedSessionSnapshot: currentSnapshot,
		}));

		rerender(
			<GameProviderInner
				darkMode
				onToggleDark={() => {}}
				devMode={false}
				musicEnabled
				onToggleMusic={() => {}}
				soundEnabled
				onToggleSound={() => {}}
				backgroundAudioMuted
				onToggleBackgroundAudioMute={() => {}}
				autoAdvanceEnabled
				onToggleAutoAdvance={() => {}}
				playerName="Warlord"
				onChangePlayerName={() => {}}
				queue={queueHelpers}
				sessionId={sessionId}
				sessionSnapshot={currentSnapshot}
				ruleSnapshot={currentSnapshot.rules}
				refreshSession={refreshSession}
				onReleaseSession={() => {}}
				registries={registries}
				resourceKeys={resourceKeys}
				sessionMetadata={currentSnapshot.metadata}
			>
				<div />
			</GameProviderInner>,
		);

		await waitFor(() => {
			expect(updateRemotePlayerName).toHaveBeenLastCalledWith({
				sessionId,
				playerId: localPlayer.id,
				playerName: 'Warlord',
			});
		});
		cleanup();
	});

	it('does not auto acknowledge resolutions when the preference is disabled', async () => {
		const registriesPayload = createSessionRegistriesPayload();
		const { adapter, cleanup } = createRemoteSessionAdapter({
			sessionId,
			snapshot: sessionState,
			registries: registriesPayload,
		});
		const enqueue = vi.fn(
			async <T,>(task: () => Promise<T> | T) => await task(),
		);
		useSessionQueueMock.mockReturnValue({
			enqueue,
			cachedSessionSnapshot: sessionState,
		});

		const queueHelpers = {
			enqueue: vi.fn(),
			getCurrentSession: () => adapter,
			getLatestSnapshot: () => null,
		};

		mockResolution = createResolutionState({
			requireAcknowledgement: true,
			isComplete: true,
		});

		render(
			<GameProviderInner
				darkMode
				onToggleDark={() => {}}
				devMode={false}
				musicEnabled
				onToggleMusic={() => {}}
				soundEnabled
				onToggleSound={() => {}}
				backgroundAudioMuted
				onToggleBackgroundAudioMute={() => {}}
				autoAdvanceEnabled={false}
				onToggleAutoAdvance={() => {}}
				playerName={localPlayer.name}
				onChangePlayerName={() => {}}
				queue={queueHelpers}
				sessionId={sessionId}
				sessionSnapshot={sessionState}
				ruleSnapshot={sessionState.rules}
				refreshSession={async () => {}}
				onReleaseSession={() => {}}
				registries={registries}
				resourceKeys={resourceKeys}
				sessionMetadata={sessionState.metadata}
			>
				<div />
			</GameProviderInner>,
		);

		await waitFor(() => {
			expect(acknowledgeResolutionMock).not.toHaveBeenCalled();
		});
		cleanup();
	});

	it('auto acknowledges completed resolutions once when enabled', async () => {
		const registriesPayload = createSessionRegistriesPayload();
		const { adapter, cleanup } = createRemoteSessionAdapter({
			sessionId,
			snapshot: sessionState,
			registries: registriesPayload,
		});
		const enqueue = vi.fn(
			async <T,>(task: () => Promise<T> | T) => await task(),
		);
		useSessionQueueMock.mockReturnValue({
			enqueue,
			cachedSessionSnapshot: sessionState,
		});

		const queueHelpers = {
			enqueue: vi.fn(),
			getCurrentSession: () => adapter,
			getLatestSnapshot: () => null,
		};

		mockResolution = createResolutionState({
			requireAcknowledgement: true,
			isComplete: false,
		});

		const { rerender } = render(
			<GameProviderInner
				darkMode
				onToggleDark={() => {}}
				devMode={false}
				musicEnabled
				onToggleMusic={() => {}}
				soundEnabled
				onToggleSound={() => {}}
				backgroundAudioMuted
				onToggleBackgroundAudioMute={() => {}}
				autoAdvanceEnabled
				onToggleAutoAdvance={() => {}}
				playerName={localPlayer.name}
				onChangePlayerName={() => {}}
				queue={queueHelpers}
				sessionId={sessionId}
				sessionSnapshot={sessionState}
				ruleSnapshot={sessionState.rules}
				refreshSession={async () => {}}
				onReleaseSession={() => {}}
				registries={registries}
				resourceKeys={resourceKeys}
				sessionMetadata={sessionState.metadata}
			>
				<div />
			</GameProviderInner>,
		);

		await waitFor(() => {
			expect(acknowledgeResolutionMock).not.toHaveBeenCalled();
		});

		mockResolution = createResolutionState({
			requireAcknowledgement: true,
			isComplete: true,
		});
		rerender(
			<GameProviderInner
				darkMode
				onToggleDark={() => {}}
				devMode={false}
				musicEnabled
				onToggleMusic={() => {}}
				soundEnabled
				onToggleSound={() => {}}
				backgroundAudioMuted
				onToggleBackgroundAudioMute={() => {}}
				autoAdvanceEnabled
				onToggleAutoAdvance={() => {}}
				playerName={localPlayer.name}
				onChangePlayerName={() => {}}
				queue={queueHelpers}
				sessionId={sessionId}
				sessionSnapshot={sessionState}
				ruleSnapshot={sessionState.rules}
				refreshSession={async () => {}}
				onReleaseSession={() => {}}
				registries={registries}
				resourceKeys={resourceKeys}
				sessionMetadata={sessionState.metadata}
			>
				<div />
			</GameProviderInner>,
		);

		await waitFor(() => {
			expect(acknowledgeResolutionMock).toHaveBeenCalledTimes(1);
		});

		rerender(
			<GameProviderInner
				darkMode
				onToggleDark={() => {}}
				devMode={false}
				musicEnabled
				onToggleMusic={() => {}}
				soundEnabled
				onToggleSound={() => {}}
				backgroundAudioMuted
				onToggleBackgroundAudioMute={() => {}}
				autoAdvanceEnabled
				onToggleAutoAdvance={() => {}}
				playerName={localPlayer.name}
				onChangePlayerName={() => {}}
				queue={queueHelpers}
				sessionId={sessionId}
				sessionSnapshot={sessionState}
				ruleSnapshot={sessionState.rules}
				refreshSession={async () => {}}
				onReleaseSession={() => {}}
				registries={registries}
				resourceKeys={resourceKeys}
				sessionMetadata={sessionState.metadata}
			>
				<div />
			</GameProviderInner>,
		);

		expect(acknowledgeResolutionMock).toHaveBeenCalledTimes(1);

		mockResolution = null;
		rerender(
			<GameProviderInner
				darkMode
				onToggleDark={() => {}}
				devMode={false}
				musicEnabled
				onToggleMusic={() => {}}
				soundEnabled
				onToggleSound={() => {}}
				backgroundAudioMuted
				onToggleBackgroundAudioMute={() => {}}
				autoAdvanceEnabled
				onToggleAutoAdvance={() => {}}
				playerName={localPlayer.name}
				onChangePlayerName={() => {}}
				queue={queueHelpers}
				sessionId={sessionId}
				sessionSnapshot={sessionState}
				ruleSnapshot={sessionState.rules}
				refreshSession={async () => {}}
				onReleaseSession={() => {}}
				registries={registries}
				resourceKeys={resourceKeys}
				sessionMetadata={sessionState.metadata}
			>
				<div />
			</GameProviderInner>,
		);

		mockResolution = createResolutionState({
			requireAcknowledgement: true,
			isComplete: true,
		});
		rerender(
			<GameProviderInner
				darkMode
				onToggleDark={() => {}}
				devMode={false}
				musicEnabled
				onToggleMusic={() => {}}
				soundEnabled
				onToggleSound={() => {}}
				backgroundAudioMuted
				onToggleBackgroundAudioMute={() => {}}
				autoAdvanceEnabled
				onToggleAutoAdvance={() => {}}
				playerName={localPlayer.name}
				onChangePlayerName={() => {}}
				queue={queueHelpers}
				sessionId={sessionId}
				sessionSnapshot={sessionState}
				ruleSnapshot={sessionState.rules}
				refreshSession={async () => {}}
				onReleaseSession={() => {}}
				registries={registries}
				resourceKeys={resourceKeys}
				sessionMetadata={sessionState.metadata}
			>
				<div />
			</GameProviderInner>,
		);

		await waitFor(() => {
			expect(acknowledgeResolutionMock).toHaveBeenCalledTimes(2);
		});
		cleanup();
	});

	it('does not auto pass when disabled or acknowledgement is pending', async () => {
		const registriesPayload = createSessionRegistriesPayload();
		const { adapter, cleanup } = createRemoteSessionAdapter({
			sessionId,
			snapshot: sessionState,
			registries: registriesPayload,
		});
		const enqueue = vi.fn(
			async <T,>(task: () => Promise<T> | T) => await task(),
		);
		useSessionQueueMock.mockReturnValue({
			enqueue,
			cachedSessionSnapshot: sessionState,
		});

		const queueHelpers = {
			enqueue: vi.fn(),
			getCurrentSession: () => adapter,
			getLatestSnapshot: () => null,
		};

		mockResolution = createResolutionState({
			requireAcknowledgement: true,
			isComplete: true,
		});

		const { rerender } = render(
			<GameProviderInner
				darkMode
				onToggleDark={() => {}}
				devMode={false}
				musicEnabled
				onToggleMusic={() => {}}
				soundEnabled
				onToggleSound={() => {}}
				backgroundAudioMuted
				onToggleBackgroundAudioMute={() => {}}
				autoAdvanceEnabled
				onToggleAutoAdvance={() => {}}
				playerName={localPlayer.name}
				onChangePlayerName={() => {}}
				queue={queueHelpers}
				sessionId={sessionId}
				sessionSnapshot={sessionState}
				ruleSnapshot={sessionState.rules}
				refreshSession={async () => {}}
				onReleaseSession={() => {}}
				registries={registries}
				resourceKeys={resourceKeys}
				sessionMetadata={sessionState.metadata}
			>
				<div />
			</GameProviderInner>,
		);

		await waitFor(() => {
			expect(handleEndTurnMock).not.toHaveBeenCalled();
		});

		rerender(
			<GameProviderInner
				darkMode
				onToggleDark={() => {}}
				devMode={false}
				musicEnabled
				onToggleMusic={() => {}}
				soundEnabled
				onToggleSound={() => {}}
				backgroundAudioMuted
				onToggleBackgroundAudioMute={() => {}}
				autoAdvanceEnabled
				onToggleAutoAdvance={() => {}}
				playerName={localPlayer.name}
				onChangePlayerName={() => {}}
				queue={queueHelpers}
				sessionId={sessionId}
				sessionSnapshot={sessionState}
				ruleSnapshot={sessionState.rules}
				refreshSession={async () => {}}
				onReleaseSession={() => {}}
				registries={registries}
				resourceKeys={resourceKeys}
				sessionMetadata={sessionState.metadata}
			>
				<div />
			</GameProviderInner>,
		);

		await waitFor(() => {
			expect(handleEndTurnMock).not.toHaveBeenCalled();
		});
		cleanup();
	});

	it('auto passes exactly once per eligible window', async () => {
		const registriesPayload = createSessionRegistriesPayload();
		const { adapter, cleanup } = createRemoteSessionAdapter({
			sessionId,
			snapshot: sessionState,
			registries: registriesPayload,
		});
		const enqueue = vi.fn(
			async <T,>(task: () => Promise<T> | T) => await task(),
		);
		useSessionQueueMock.mockReturnValue({
			enqueue,
			cachedSessionSnapshot: sessionState,
		});

		const queueHelpers = {
			enqueue: vi.fn(),
			getCurrentSession: () => adapter,
			getLatestSnapshot: () => null,
		};

		mockResolution = null;
		mockPhaseState = {
			...mockPhaseState,
			canEndTurn: true,
			isAdvancing: false,
		};

		const { rerender } = render(
			<GameProviderInner
				darkMode
				onToggleDark={() => {}}
				devMode={false}
				musicEnabled
				onToggleMusic={() => {}}
				soundEnabled
				onToggleSound={() => {}}
				backgroundAudioMuted
				onToggleBackgroundAudioMute={() => {}}
				autoAdvanceEnabled
				onToggleAutoAdvance={() => {}}
				playerName={localPlayer.name}
				onChangePlayerName={() => {}}
				queue={queueHelpers}
				sessionId={sessionId}
				sessionSnapshot={sessionState}
				ruleSnapshot={sessionState.rules}
				refreshSession={async () => {}}
				onReleaseSession={() => {}}
				registries={registries}
				resourceKeys={resourceKeys}
				sessionMetadata={sessionState.metadata}
			>
				<div />
			</GameProviderInner>,
		);

		await waitFor(() => {
			expect(handleEndTurnMock).toHaveBeenCalledTimes(1);
		});

		rerender(
			<GameProviderInner
				darkMode
				onToggleDark={() => {}}
				devMode={false}
				musicEnabled
				onToggleMusic={() => {}}
				soundEnabled
				onToggleSound={() => {}}
				backgroundAudioMuted
				onToggleBackgroundAudioMute={() => {}}
				autoAdvanceEnabled
				onToggleAutoAdvance={() => {}}
				playerName={localPlayer.name}
				onChangePlayerName={() => {}}
				queue={queueHelpers}
				sessionId={sessionId}
				sessionSnapshot={sessionState}
				ruleSnapshot={sessionState.rules}
				refreshSession={async () => {}}
				onReleaseSession={() => {}}
				registries={registries}
				resourceKeys={resourceKeys}
				sessionMetadata={sessionState.metadata}
			>
				<div />
			</GameProviderInner>,
		);

		expect(handleEndTurnMock).toHaveBeenCalledTimes(1);

		mockPhaseState = {
			...mockPhaseState,
			canEndTurn: false,
		};
		rerender(
			<GameProviderInner
				darkMode
				onToggleDark={() => {}}
				devMode={false}
				musicEnabled
				onToggleMusic={() => {}}
				soundEnabled
				onToggleSound={() => {}}
				backgroundAudioMuted
				onToggleBackgroundAudioMute={() => {}}
				autoAdvanceEnabled
				onToggleAutoAdvance={() => {}}
				playerName={localPlayer.name}
				onChangePlayerName={() => {}}
				queue={queueHelpers}
				sessionId={sessionId}
				sessionSnapshot={sessionState}
				ruleSnapshot={sessionState.rules}
				refreshSession={async () => {}}
				onReleaseSession={() => {}}
				registries={registries}
				resourceKeys={resourceKeys}
				sessionMetadata={sessionState.metadata}
			>
				<div />
			</GameProviderInner>,
		);

		expect(handleEndTurnMock).toHaveBeenCalledTimes(1);

		mockPhaseState = {
			...mockPhaseState,
			canEndTurn: true,
		};
		rerender(
			<GameProviderInner
				darkMode
				onToggleDark={() => {}}
				devMode={false}
				musicEnabled
				onToggleMusic={() => {}}
				soundEnabled
				onToggleSound={() => {}}
				backgroundAudioMuted
				onToggleBackgroundAudioMute={() => {}}
				autoAdvanceEnabled
				onToggleAutoAdvance={() => {}}
				playerName={localPlayer.name}
				onChangePlayerName={() => {}}
				queue={queueHelpers}
				sessionId={sessionId}
				sessionSnapshot={sessionState}
				ruleSnapshot={sessionState.rules}
				refreshSession={async () => {}}
				onReleaseSession={() => {}}
				registries={registries}
				resourceKeys={resourceKeys}
				sessionMetadata={sessionState.metadata}
			>
				<div />
			</GameProviderInner>,
		);

		await waitFor(() => {
			expect(handleEndTurnMock).toHaveBeenCalledTimes(2);
		});
		cleanup();
	});
});
