/** @vitest-environment jsdom */
import React, { useContext, useEffect } from 'react';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import type { SessionSnapshot } from '@kingdom-builder/protocol/session';
import {
	GameEngineContext,
	GameProviderInner,
} from '../../src/state/GameProviderInner';
import type { LegacyGameEngineContextValue } from '../../src/state/GameContext.types';
import type { SessionQueueHelpers } from '../../src/state/sessionTypes';
import { createLegacySessionMock } from '../helpers/createLegacySessionMock';
import {
	createSessionRegistries,
	createResourceKeys,
} from '../helpers/sessionRegistries';
import {
	createSessionSnapshot,
	createSnapshotPlayer,
} from '../helpers/sessionFixtures';

const useSessionQueueMock = vi.hoisted(() => vi.fn());
const useSessionTranslationContextMock = vi.hoisted(() => vi.fn());
const useTimeScaleMock = vi.hoisted(() =>
	vi.fn(() => ({
		timeScale: 1,
		setTimeScale: vi.fn(),
		clearTrackedTimeout: vi.fn(),
		setTrackedTimeout: vi.fn(),
		isMountedRef: { current: true },
		timeScaleRef: { current: 1 },
	})),
);
const useHoverCardMock = vi.hoisted(() =>
	vi.fn(() => ({
		hoverCard: null,
		handleHoverCard: vi.fn(),
		clearHoverCard: vi.fn(),
	})),
);
const useGameLogMock = vi.hoisted(() =>
	vi.fn(() => ({
		log: [],
		logOverflowed: false,
		addLog: vi.fn(),
	})),
);
const useActionResolutionMock = vi.hoisted(() =>
	vi.fn(() => ({
		resolution: null,
		showResolution: vi.fn(),
		acknowledgeResolution: vi.fn(),
	})),
);
const usePhaseProgressMock = vi.hoisted(() => vi.fn());
const useActionPerformerMock = vi.hoisted(() => vi.fn());
const useToastsMock = vi.hoisted(() =>
	vi.fn(() => ({
		toasts: [],
		pushToast: vi.fn(),
		pushErrorToast: vi.fn(),
		pushSuccessToast: vi.fn(),
		dismissToast: vi.fn(),
	})),
);
const useCompensationLoggerMock = vi.hoisted(() => vi.fn());
const useAiRunnerMock = vi.hoisted(() => vi.fn());

vi.mock('../../src/state/useSessionQueue', () => ({
	useSessionQueue: useSessionQueueMock,
}));
vi.mock('../../src/state/useSessionTranslationContext', () => ({
	useSessionTranslationContext: useSessionTranslationContextMock,
}));
vi.mock('../../src/state/useTimeScale', () => ({
	useTimeScale: useTimeScaleMock,
}));
vi.mock('../../src/state/useHoverCard', () => ({
	useHoverCard: useHoverCardMock,
}));
vi.mock('../../src/state/useGameLog', () => ({
	useGameLog: useGameLogMock,
}));
vi.mock('../../src/state/useActionResolution', () => ({
	useActionResolution: useActionResolutionMock,
}));
vi.mock('../../src/state/usePhaseProgress', () => ({
	usePhaseProgress: usePhaseProgressMock,
}));
vi.mock('../../src/state/useActionPerformer', () => ({
	useActionPerformer: useActionPerformerMock,
}));
vi.mock('../../src/state/useToasts', () => ({
	useToasts: useToastsMock,
}));
vi.mock('../../src/state/useCompensationLogger', () => ({
	useCompensationLogger: useCompensationLoggerMock,
}));
vi.mock('../../src/state/useAiRunner', () => ({
	useAiRunner: useAiRunnerMock,
}));

function TestConsumer({
	onContext,
}: {
	onContext: (value: LegacyGameEngineContextValue | null) => void;
}) {
	const context = useContext(GameEngineContext);
	useEffect(() => {
		onContext(context);
	}, [context, onContext]);
	return null;
}

describe('GameProviderInner', () => {
	const sessionId = 'session-inner';
	const resourceKeys = createResourceKeys();
	const registries = createSessionRegistries();
	const playerA = createSnapshotPlayer({ id: 'player-a' });
	const playerB = createSnapshotPlayer({ id: 'player-b' });
	const engineSnapshot = createSessionSnapshot({
		players: [playerA, playerB],
		activePlayerId: playerA.id,
		opponentId: playerB.id,
		phases: [
			{
				id: 'phase:test',
				name: 'Test Phase',
				action: true,
				steps: [{ id: 'phase:test:start', name: 'Start' }],
			},
		],
		actionCostResource: resourceKeys[0] ?? 'resource:test',
		ruleSnapshot: {
			tieredResourceKey: resourceKeys[0] ?? 'resource:test',
			tierDefinitions: [],
			winConditions: [],
		},
	}) as unknown as SessionSnapshot;
	const primaryPlayerName = engineSnapshot.game.players[0]?.name ?? 'Commander';
	const enqueueFromStore = vi.fn(async <T,>(task: () => Promise<T> | T) => {
		return await task();
	});
	const queueHelpers: SessionQueueHelpers = {
		enqueue: vi.fn(),
		getCurrentSession: vi.fn(),
		getLatestSnapshot: vi.fn(() => null),
	};
	const adapter = createLegacySessionMock({ snapshot: engineSnapshot });
	const cachedSnapshot = engineSnapshot;
	const handlePerform = vi.fn();
	let phaseOptions: Record<string, unknown> | null = null;
	let capturedContext: LegacyGameEngineContextValue | null = null;

	beforeEach(() => {
		useSessionQueueMock.mockReset();
		useSessionTranslationContextMock.mockReset();
		usePhaseProgressMock.mockReset();
		useActionPerformerMock.mockReset();
		useCompensationLoggerMock.mockReset();
		useAiRunnerMock.mockReset();
		enqueueFromStore.mockClear();
		handlePerform.mockReset();
		phaseOptions = null;
		capturedContext = null;
		useSessionQueueMock.mockReturnValue({
			adapter,
			enqueue: enqueueFromStore,
			cachedSessionSnapshot: cachedSnapshot,
		});
		useSessionTranslationContextMock.mockReturnValue({
			translationContext: {},
			isReady: true,
		});
		usePhaseProgressMock.mockImplementation(
			(options: Record<string, unknown>) => {
				phaseOptions = options;
				return {
					phase: {
						currentPhaseId: 'phase:test',
						isActionPhase: true,
						canEndTurn: true,
						isAdvancing: false,
					},
					runUntilActionPhase: vi.fn(),
					runUntilActionPhaseCore: vi.fn(),
					handleEndTurn: vi.fn(),
					endTurn: vi.fn(),
					applyPhaseSnapshot: vi.fn(),
					refreshPhaseState: vi.fn(),
				};
			},
		);
		useActionPerformerMock.mockReturnValue({
			handlePerform,
		});
		useCompensationLoggerMock.mockReturnValue(undefined);
		useAiRunnerMock.mockReturnValue(undefined);
	});

	it('routes the remote session adapter through hooks and context', () => {
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
				playerName={primaryPlayerName}
				onChangePlayerName={() => {}}
				queue={queueHelpers}
				sessionId={sessionId}
				sessionState={engineSnapshot}
				ruleSnapshot={engineSnapshot.rules}
				refreshSession={async () => {}}
				onReleaseSession={() => {}}
				registries={registries}
				resourceKeys={resourceKeys}
				sessionMetadata={engineSnapshot.metadata as never}
			>
				<TestConsumer
					onContext={(value) => {
						capturedContext = value;
					}}
				/>
			</GameProviderInner>,
		);

		expect(useSessionQueueMock).toHaveBeenCalledWith(
			queueHelpers,
			engineSnapshot,
			sessionId,
		);
		expect(usePhaseProgressMock).toHaveBeenCalled();
		expect(phaseOptions).not.toBeNull();
		expect(phaseOptions).toMatchObject({ enqueue: enqueueFromStore });
		expect(useActionPerformerMock).toHaveBeenCalledWith(
			expect.objectContaining({
				session: adapter,
				enqueue: enqueueFromStore,
			}),
		);
		expect(useAiRunnerMock).toHaveBeenCalledWith(
			expect.objectContaining({ session: adapter }),
		);
		expect(useCompensationLoggerMock).toHaveBeenCalledWith(
			expect.objectContaining({ sessionState: engineSnapshot }),
		);
		expect(capturedContext).not.toBeNull();
		expect(capturedContext?.session).toBe(adapter);
		expect(capturedContext?.sessionId).toBe(sessionId);
		expect(handlePerform).not.toHaveBeenCalled();
	});
});
