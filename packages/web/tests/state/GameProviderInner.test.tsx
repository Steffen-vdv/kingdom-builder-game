/** @vitest-environment jsdom */
import React, { useContext } from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionSnapshot } from '@kingdom-builder/protocol/session';
import {
	GameProviderInner,
	GameEngineContext,
} from '../../src/state/GameProviderInner';
import {
	createSessionSnapshot,
	createSnapshotPlayer,
} from '../helpers/sessionFixtures';
import { createSessionRegistries } from '../helpers/sessionRegistries';
import { createLegacySessionMock } from '../helpers/createLegacySessionMock';
import type { SessionQueueHelpers } from '../../src/state/sessionTypes';

const registryProviderMock = vi.hoisted(() =>
	vi.fn(({ children }: { children: React.ReactNode }) => <>{children}</>),
);

const sessionQueueMock = vi.hoisted(() => vi.fn());
const translationContextMock = vi.hoisted(() => vi.fn());
const timeScaleMock = vi.hoisted(() => vi.fn());
const hoverCardMock = vi.hoisted(() => vi.fn());
const gameLogMock = vi.hoisted(() => vi.fn());
const actionResolutionMock = vi.hoisted(() => vi.fn());
const phaseProgressMock = vi.hoisted(() => vi.fn());
const toastsMock = vi.hoisted(() => vi.fn());
const compensationLoggerMock = vi.hoisted(() => vi.fn());
const actionPerformerMock = vi.hoisted(() => vi.fn());
const aiRunnerMock = vi.hoisted(() => vi.fn());

vi.mock('../../src/contexts/RegistryMetadataContext', () => ({
	RegistryMetadataProvider: registryProviderMock,
}));

vi.mock('../../src/state/useSessionQueue', () => ({
	useSessionQueue: sessionQueueMock,
}));

vi.mock('../../src/state/useSessionTranslationContext', () => ({
	useSessionTranslationContext: translationContextMock,
}));

vi.mock('../../src/state/useTimeScale', () => ({
	useTimeScale: timeScaleMock,
}));

vi.mock('../../src/state/useHoverCard', () => ({
	useHoverCard: hoverCardMock,
}));

vi.mock('../../src/state/useGameLog', () => ({
	useGameLog: gameLogMock,
}));

vi.mock('../../src/state/useActionResolution', () => ({
	useActionResolution: actionResolutionMock,
}));

vi.mock('../../src/state/usePhaseProgress', () => ({
	usePhaseProgress: phaseProgressMock,
}));

vi.mock('../../src/state/useToasts', () => ({
	useToasts: toastsMock,
}));

vi.mock('../../src/state/useCompensationLogger', () => ({
	useCompensationLogger: compensationLoggerMock,
}));

vi.mock('../../src/state/useActionPerformer', () => ({
	useActionPerformer: actionPerformerMock,
}));

vi.mock('../../src/state/useAiRunner', () => ({
	useAiRunner: aiRunnerMock,
}));

vi.mock('../../src/state/sessionSelectors', () => ({
	selectSessionView: () => ({
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
	}),
}));

vi.mock('../../src/state/sessionSdk', () => ({
	updatePlayerName: vi.fn(() => Promise.resolve()),
}));

const TestConsumer = () => {
	const context = useContext(GameEngineContext);
	if (!context) {
		return null;
	}
	return (
		<div data-testid="session-turn">{context.sessionSnapshot.game.turn}</div>
	);
};

describe('GameProviderInner', () => {
	const queueHelpers: SessionQueueHelpers = {
		enqueue: async (task) => await task(),
		getCurrentSession: () => {
			throw new Error('queue.getCurrentSession should not be used');
		},
		getLatestSnapshot: () => null,
	};

	beforeEach(() => {
		sessionQueueMock.mockReset();
		translationContextMock.mockReset();
		timeScaleMock.mockReset();
		hoverCardMock.mockReset();
		gameLogMock.mockReset();
		actionResolutionMock.mockReset();
		phaseProgressMock.mockReset();
		toastsMock.mockReset();
		compensationLoggerMock.mockReset();
		actionPerformerMock.mockReset();
		aiRunnerMock.mockReset();
	});

	it('passes the remote adapter and cached snapshot to downstream hooks', () => {
		const player = createSnapshotPlayer({ id: 'player-A', name: 'Commander' });
		const opponent = createSnapshotPlayer({ id: 'player-B', name: 'Rival' });
		const baseSnapshot = createSessionSnapshot({
			players: [player, opponent],
			activePlayerId: player.id,
			opponentId: opponent.id,
			phases: [
				{
					id: 'phase:main',
					action: true,
					steps: [{ id: 'phase:main:start' }],
				},
			],
			actionCostResource: 'resource:action',
			ruleSnapshot: {
				tieredResourceKey: 'resource:action',
				tierDefinitions: [],
				winConditions: [],
			},
			turn: 3,
		}) as unknown as SessionSnapshot;
		const cachedSnapshot = {
			...baseSnapshot,
			game: {
				...baseSnapshot.game,
				turn: baseSnapshot.game.turn + 1,
			},
		} as SessionSnapshot;
		const adapter = createLegacySessionMock({ snapshot: cachedSnapshot });
		sessionQueueMock.mockReturnValue({
			adapter,
			enqueue: vi.fn(async (task) => await task()),
			cachedSessionSnapshot: cachedSnapshot,
		});
		translationContextMock.mockReturnValue({
			translationContext: {},
			isReady: true,
		});
		timeScaleMock.mockReturnValue({
			timeScale: 1,
			setTimeScale: vi.fn(),
			clearTrackedTimeout: vi.fn(),
			setTrackedTimeout: vi.fn(),
			isMountedRef: { current: true },
			timeScaleRef: { current: 1 },
		});
		hoverCardMock.mockReturnValue({
			hoverCard: null,
			handleHoverCard: vi.fn(),
			clearHoverCard: vi.fn(),
		});
		gameLogMock.mockReturnValue({
			log: [],
			logOverflowed: false,
			addLog: vi.fn(),
		});
		actionResolutionMock.mockReturnValue({
			resolution: null,
			showResolution: vi.fn(),
			acknowledgeResolution: vi.fn(),
		});
		const phaseOptions: unknown[] = [];
		phaseProgressMock.mockImplementation((options: unknown) => {
			phaseOptions.push(options);
			return {
				phase: {
					currentPhaseId: 'phase:main',
					isActionPhase: true,
					canEndTurn: false,
					isAdvancing: false,
				},
				runUntilActionPhase: vi.fn(),
				runUntilActionPhaseCore: vi.fn(),
				handleEndTurn: vi.fn(),
				endTurn: vi.fn(),
				applyPhaseSnapshot: vi.fn(),
				refreshPhaseState: vi.fn(),
			};
		});
		const compensationArgs: unknown[] = [];
		compensationLoggerMock.mockImplementation((options: unknown) => {
			compensationArgs.push(options);
		});
		const actionArgs: unknown[] = [];
		actionPerformerMock.mockImplementation((options: unknown) => {
			actionArgs.push(options);
			return { handlePerform: vi.fn() };
		});
		const aiArgs: unknown[] = [];
		aiRunnerMock.mockImplementation((options: unknown) => {
			aiArgs.push(options);
		});
		toastsMock.mockReturnValue({
			toasts: [],
			pushToast: vi.fn(),
			pushErrorToast: vi.fn(),
			pushSuccessToast: vi.fn(),
			dismissToast: vi.fn(),
		});

		render(
			<GameProviderInner
				queue={queueHelpers}
				sessionId="session:test"
				sessionState={baseSnapshot}
				ruleSnapshot={baseSnapshot.rules}
				refreshSession={vi.fn()}
				onReleaseSession={vi.fn()}
				registries={createSessionRegistries()}
				resourceKeys={['resource:action']}
				sessionMetadata={baseSnapshot.metadata}
			>
				<TestConsumer />
			</GameProviderInner>,
		);

		expect(phaseOptions).toHaveLength(1);
		const phaseOption = phaseOptions[0] as { sessionState: SessionSnapshot };
		expect(phaseOption.sessionState).toBe(cachedSnapshot);

		expect(compensationArgs).toHaveLength(1);
		const compensationOption = compensationArgs[0] as {
			sessionState: SessionSnapshot;
		};
		expect(compensationOption.sessionState).toBe(cachedSnapshot);

		expect(actionArgs).toHaveLength(1);
		const actionOption = actionArgs[0] as { session: unknown };
		expect(actionOption.session).toBe(adapter);

		expect(aiArgs).toHaveLength(1);
		const aiOption = aiArgs[0] as {
			session: unknown;
			sessionState: SessionSnapshot;
		};
		expect(aiOption.session).toBe(adapter);
		expect(aiOption.sessionState).toBe(cachedSnapshot);

		expect(screen.getByTestId('session-turn')).toHaveTextContent('4');
	});
});
