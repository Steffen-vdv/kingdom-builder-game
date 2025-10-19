/** @vitest-environment jsdom */
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import type { SessionSnapshot } from '@kingdom-builder/protocol/session';
import { GameProviderInner } from '../../src/state/GameProviderInner';
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

const runUntilActionPhaseMock = vi.fn(() => Promise.resolve());
const runUntilActionPhaseCoreMock = vi.fn(() => Promise.resolve());
const handleEndTurnMock = vi.fn();
const applyPhaseSnapshotMock = vi.fn();
const refreshPhaseStateMock = vi.fn();
const handlePerformMock = vi.fn();
const useSessionQueueMock = vi.fn();
let capturedPhaseOptions: Record<string, unknown> | null = null;
let capturedPerformerOptions: Record<string, unknown> | null = null;
let capturedAiOptions: Record<string, unknown> | null = null;
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
		addLog: vi.fn(),
	}),
}));

vi.mock('../../src/state/useActionResolution', () => ({
	useActionResolution: () => ({
		resolution: null,
		showResolution: vi.fn(),
		acknowledgeResolution: vi.fn(),
	}),
}));

vi.mock('../../src/state/usePhaseProgress', () => ({
	usePhaseProgress: (options: Record<string, unknown>) => {
		capturedPhaseOptions = options;
		return {
			phase: {
				currentPhaseId: 'phase:test',
				isActionPhase: true,
				canEndTurn: true,
				isAdvancing: false,
				activePlayerId: 'player-test',
				activePlayerName: 'Player Test',
			},
			runUntilActionPhase: runUntilActionPhaseMock,
			runUntilActionPhaseCore: runUntilActionPhaseCoreMock,
			handleEndTurn: handleEndTurnMock,
			endTurn: vi.fn(),
			applyPhaseSnapshot: applyPhaseSnapshotMock,
			refreshPhaseState: refreshPhaseStateMock,
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
		handlePerformMock.mockClear();
		useSessionQueueMock.mockReset();
		vi.mocked(updateRemotePlayerName).mockClear();
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
	});

	it('routes the remote adapter through hooks for the playbook', () => {
		const registriesPayload = createSessionRegistriesPayload();
		const { adapter, cleanup } = createRemoteSessionAdapter({
			sessionId,
			snapshot: sessionState,
			registries: registriesPayload,
		});
		(adapter as { id: string }).id = 'adapter:test';
		const enqueue = vi.fn(
			async <T,>(task: () => Promise<T> | T) => await task(),
		);
		const queueHelpers = {
			enqueue: vi.fn(),
			getCurrentSession: () => adapter,
			getLatestSnapshot: () => null,
		};
		useSessionQueueMock.mockReturnValue({
			adapter,
			enqueue,
			cachedSessionSnapshot: sessionState,
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
			/>,
		);

		expect(capturedPerformerOptions).not.toHaveProperty('session');
		expect(capturedPerformerOptions?.sessionId).toBe(sessionId);
		expect(capturedAiOptions?.sessionId).toBe(sessionId);
		expect(capturedPhaseOptions?.enqueue).toBe(enqueue);
		expect(capturedLoggerOptions?.sessionId).toBe(sessionId);
		expect(capturedTranslationOptions?.sessionSnapshot).toBe(sessionState);
		expect(useSessionQueueMock).toHaveBeenCalledWith(
			queueHelpers,
			sessionState,
			sessionId,
		);
		cleanup();
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
		const queueHelpers = {
			enqueue: vi.fn(),
			getCurrentSession: () => adapter,
			getLatestSnapshot: () => null,
		};
		useSessionQueueMock.mockImplementation(() => ({
			adapter,
			enqueue,
			cachedSessionSnapshot: currentSnapshot,
		}));

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
			/>,
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
			adapter,
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
			/>,
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
});
