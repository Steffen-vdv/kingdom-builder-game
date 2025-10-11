/** @vitest-environment jsdom */
import React, { useEffect } from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import type { LegacySession } from '../../src/state/sessionTypes';
import { GameProvider, useGameEngine } from '../../src/state/GameContext';
import {
	createSessionSnapshot,
	createSnapshotPlayer,
} from '../helpers/sessionFixtures';
import {
	createResourceKeys,
	createSessionRegistries,
} from '../helpers/sessionRegistries';
import { GameApiError } from '../../src/services/gameApi';
import type { ResourceKey } from '@kingdom-builder/contents';

const createSessionMock = vi.hoisted(() => vi.fn());
const fetchSnapshotMock = vi.hoisted(() => vi.fn());
const releaseSessionMock = vi.hoisted(() => vi.fn());
const performSessionActionMock = vi.hoisted(() => vi.fn());

vi.mock('../../src/state/sessionSdk', () => ({
	createSession: createSessionMock,
	fetchSnapshot: fetchSnapshotMock,
	releaseSession: releaseSessionMock,
	performSessionAction: performSessionActionMock,
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
	usePhaseProgress: () => ({
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

const getLegacySessionContextMock = vi.hoisted(() => vi.fn());
vi.mock('../../src/state/getLegacySessionContext', () => ({
	getLegacySessionContext: getLegacySessionContextMock,
}));

vi.mock('../../src/translation/context', () => ({
	createTranslationContext: vi.fn(() => ({})),
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

const TEST_ACTION = { id: 'action:test', name: 'Test Action' } as const;

function SessionInspector() {
	const { sessionState } = useGameEngine();
	return <div data-testid="session-turn">turn:{sessionState.game.turn}</div>;
}

function ActionHarness({
	onReady,
}: {
	onReady: (trigger: () => Promise<void>) => void;
}) {
	const { handlePerform } = useGameEngine();
	useEffect(() => {
		onReady(() => handlePerform(TEST_ACTION));
	}, [handlePerform, onReady]);
	return null;
}

describe('GameProvider fatal action handling', () => {
	let registries: ReturnType<typeof createSessionRegistries>;
	let resourceKeys: ResourceKey[];
	let initialSnapshot: ReturnType<typeof createSessionSnapshot>;
	let legacySession: LegacySession;

	beforeEach(() => {
		createSessionMock.mockReset();
		fetchSnapshotMock.mockReset();
		releaseSessionMock.mockReset();
		performSessionActionMock.mockReset();
		getLegacySessionContextMock.mockReset();
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

		runUntilActionPhaseMock.mockResolvedValue(undefined);

		const [resourceKey] = createResourceKeys();
		if (!resourceKey) {
			throw new Error('RESOURCE_KEYS is empty');
		}
		resourceKeys = [resourceKey];
		registries = createSessionRegistries();
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
		const enqueueMock = vi.fn(async <T,>(task: () => Promise<T> | T) => {
			return await task();
		});
		legacySession = {
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
		const sessionHandle = {
			enqueue: enqueueMock,
			advancePhase: vi.fn(),
			performAction: vi.fn(),
		};
		createSessionMock.mockResolvedValue({
			sessionId: 'session-1',
			session: sessionHandle,
			legacySession,
			snapshot: initialSnapshot,
			ruleSnapshot: initialSnapshot.rules,
			registries,
			resourceKeys,
			metadata: initialSnapshot.metadata,
		});
		fetchSnapshotMock.mockResolvedValue({
			session: sessionHandle,
			legacySession,
			snapshot: initialSnapshot,
			ruleSnapshot: initialSnapshot.rules,
			registries,
			resourceKeys,
			metadata: initialSnapshot.metadata,
		});
		const translationContext = {
			actions: new Map([[TEST_ACTION.id, { icon: '🔥' }]]),
		};
		getLegacySessionContextMock.mockReturnValue({
			translationContext,
			diffContext: {},
		});
	});

	afterEach(() => {
		cleanup();
	});

	async function renderGame(onReady: (trigger: () => Promise<void>) => void) {
		render(
			<GameProvider playerName="Commander">
				<SessionInspector />
				<ActionHarness onReady={onReady} />
			</GameProvider>,
		);
		await waitFor(() =>
			expect(screen.getByTestId('session-turn')).toHaveTextContent('turn:1'),
		);
	}

	async function expectFatalRecovery(trigger: () => Promise<void>) {
		await act(async () => {
			await trigger();
		});
		await waitFor(() =>
			expect(
				screen.getByText('We could not load your kingdom.'),
			).toBeInTheDocument(),
		);
	}

	it('recovers when an action fails without requirement data', async () => {
		performSessionActionMock.mockResolvedValue({
			status: 'error',
			error: 'Action exploded',
		});
		let trigger: (() => Promise<void>) | null = null;
		await renderGame((fn) => {
			trigger = fn;
		});
		await waitFor(() => expect(trigger).toBeTypeOf('function'));
		await expectFatalRecovery(trigger!);
	});

	it('recovers when the game API rejects the action request', async () => {
		performSessionActionMock.mockRejectedValue(
			new GameApiError('Service failure', 500, 'Internal', {}),
		);
		let trigger: (() => Promise<void>) | null = null;
		await renderGame((fn) => {
			trigger = fn;
		});
		await waitFor(() => expect(trigger).toBeTypeOf('function'));
		await expectFatalRecovery(trigger!);
	});

	it('releases the session when the local session cannot be found', async () => {
		performSessionActionMock.mockRejectedValue(
			new Error('Session not found: session-1'),
		);
		let trigger: (() => Promise<void>) | null = null;
		await renderGame((fn) => {
			trigger = fn;
		});
		await waitFor(() => expect(trigger).toBeTypeOf('function'));
		await expectFatalRecovery(trigger!);
	});

	it('recovers when legacy context setup fails before an action', async () => {
		getLegacySessionContextMock.mockImplementationOnce(() => {
			throw new Error('Context bootstrap failed');
		});
		let trigger: (() => Promise<void>) | null = null;
		await renderGame((fn) => {
			trigger = fn;
		});
		await waitFor(() => expect(trigger).toBeTypeOf('function'));
		await expectFatalRecovery(trigger!);
		expect(performSessionActionMock).not.toHaveBeenCalled();
	});

	it('recovers when legacy context sync fails after an action', async () => {
		const defaultContext = getLegacySessionContextMock.mock.results[0]
			?.value ?? {
			translationContext: {
				actions: new Map([[TEST_ACTION.id, { icon: '🔥' }]]),
			},
			diffContext: {},
		};
		getLegacySessionContextMock.mockReset();
		getLegacySessionContextMock
			.mockImplementationOnce(() => defaultContext)
			.mockImplementationOnce(() => {
				throw new Error('Context sync failed');
			});
		performSessionActionMock.mockResolvedValue({
			status: 'success',
			snapshot: initialSnapshot,
			costs: {},
			traces: [],
		});
		let trigger: (() => Promise<void>) | null = null;
		await renderGame((fn) => {
			trigger = fn;
		});
		await waitFor(() => expect(trigger).toBeTypeOf('function'));
		await expectFatalRecovery(trigger!);
	});
});
