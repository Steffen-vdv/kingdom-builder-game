/** @vitest-environment jsdom */
import React, { useContext } from 'react';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
	SessionRuleSnapshot,
	SessionSnapshot,
} from '@kingdom-builder/protocol/session';
import type * as SessionSdkModule from '../../src/state/sessionSdk';
import type { TranslationContext } from '../../src/translation/context';
import {
	GameEngineContext,
	GameProviderInner,
} from '../../src/state/GameProviderInner';
import type { GameProviderInnerProps } from '../../src/state/GameProviderInner.types';
import type { SessionQueueHelpers } from '../../src/state/sessionTypes';
import { createLegacySessionMock } from '../helpers/createLegacySessionMock';
import { createSessionRegistries } from '../helpers/sessionRegistries';
import {
	createSessionSnapshot,
	createSnapshotPlayer,
} from '../helpers/sessionFixtures';

const mocks = vi.hoisted(() => ({
	useSessionQueue: vi.fn(),
	useSessionTranslationContext: vi.fn(),
	useTimeScale: vi.fn(),
	useHoverCard: vi.fn(),
	useGameLog: vi.fn(),
	useActionResolution: vi.fn(),
	usePhaseProgress: vi.fn(),
	useActionPerformer: vi.fn(),
	useToasts: vi.fn(),
	useCompensationLogger: vi.fn(),
	useAiRunner: vi.fn(),
	updateRemotePlayerName: vi.fn(),
}));

vi.mock('../../src/state/useSessionQueue', () => ({
	useSessionQueue: mocks.useSessionQueue,
}));

vi.mock('../../src/state/useSessionTranslationContext', () => ({
	useSessionTranslationContext: mocks.useSessionTranslationContext,
}));

vi.mock('../../src/state/useTimeScale', () => ({
	useTimeScale: mocks.useTimeScale,
}));

vi.mock('../../src/state/useHoverCard', () => ({
	useHoverCard: mocks.useHoverCard,
}));

vi.mock('../../src/state/useGameLog', () => ({
	useGameLog: mocks.useGameLog,
}));

vi.mock('../../src/state/useActionResolution', () => ({
	useActionResolution: mocks.useActionResolution,
}));

vi.mock('../../src/state/usePhaseProgress', () => ({
	usePhaseProgress: mocks.usePhaseProgress,
}));

vi.mock('../../src/state/useActionPerformer', () => ({
	useActionPerformer: mocks.useActionPerformer,
}));

vi.mock('../../src/state/useToasts', () => ({
	useToasts: mocks.useToasts,
}));

vi.mock('../../src/state/useCompensationLogger', () => ({
	useCompensationLogger: mocks.useCompensationLogger,
}));

vi.mock('../../src/state/useAiRunner', () => ({
	useAiRunner: mocks.useAiRunner,
}));

vi.mock('../../src/state/sessionSdk', async (original) => {
	const actual = await original<typeof SessionSdkModule>();
	return {
		...actual,
		updateRemotePlayerName: mocks.updateRemotePlayerName,
	};
});

function createProps(): GameProviderInnerProps {
	const registries = createSessionRegistries();
	const players = [
		createSnapshotPlayer({
			id: 'A',
			name: 'Commander',
			resources: { gold: 10 },
		}),
		createSnapshotPlayer({ id: 'B', name: 'Scout', resources: { gold: 5 } }),
	];
	const phases = [
		{ id: 'phase:main', action: true, steps: [{ id: 'phase:main:start' }] },
	];
	const ruleSnapshot: SessionRuleSnapshot = {
		tieredResourceKey: 'gold',
		tierDefinitions: [],
		winConditions: [],
	};
	const sessionState = createSessionSnapshot({
		players,
		activePlayerId: 'A',
		opponentId: 'B',
		phases,
		actionCostResource: 'gold',
		ruleSnapshot,
	});
	const sessionSnapshot = sessionState as unknown as SessionSnapshot;
	const sessionAdapter = createLegacySessionMock({
		snapshot: sessionSnapshot,
	});
	const queueHelpers: SessionQueueHelpers = {
		async enqueue<T>(task: () => Promise<T> | T) {
			return await task();
		},
		getCurrentSession: () => sessionAdapter,
		getLatestSnapshot: () => null,
	};
	const resourceKeys: GameProviderInnerProps['resourceKeys'] = ['gold'];
	const translationContext = {} as TranslationContext;
	mocks.useSessionQueue.mockReturnValue({
		session: sessionAdapter,
		enqueue: vi.fn(),
		cachedSessionSnapshot: sessionSnapshot,
	});
	mocks.useSessionTranslationContext.mockReturnValue({
		translationContext,
		isReady: true,
	});
	const isMountedRef = { current: true };
	const timeScaleRef = { current: 1 };
	mocks.useTimeScale.mockReturnValue({
		timeScale: 1,
		setTimeScale: vi.fn(),
		clearTrackedTimeout: vi.fn(),
		setTrackedTimeout: vi.fn(),
		isMountedRef,
		timeScaleRef,
	});
	mocks.useHoverCard.mockReturnValue({
		hoverCard: null,
		handleHoverCard: vi.fn(),
		clearHoverCard: vi.fn(),
	});
	const addLog = vi.fn();
	mocks.useGameLog.mockReturnValue({
		log: [],
		logOverflowed: false,
		addLog,
	});
	const acknowledgeResolution = vi.fn();
	const showResolution = vi.fn(async () => {});
	mocks.useActionResolution.mockReturnValue({
		resolution: null,
		showResolution,
		acknowledgeResolution,
	});
	const applyPhaseSnapshot = vi.fn();
	const refreshPhaseState = vi.fn();
	const runUntilActionPhase = vi.fn(async () => {});
	const runUntilActionPhaseCore = vi.fn(async () => {});
	const handleEndTurn = vi.fn(async () => {});
	const endTurn = vi.fn(async () => {});
	mocks.usePhaseProgress.mockReturnValue({
		phase: {
			currentPhaseId: 'phase:main',
			isActionPhase: true,
			canEndTurn: true,
			isAdvancing: false,
		},
		runUntilActionPhase,
		runUntilActionPhaseCore,
		handleEndTurn,
		endTurn,
		applyPhaseSnapshot,
		refreshPhaseState,
	});
	const performRef = { current: vi.fn(async () => {}) };
	const handlePerform = vi.fn(async () => {});
	mocks.useActionPerformer.mockReturnValue({
		handlePerform,
		performRef,
	});
	mocks.useToasts.mockReturnValue({
		toasts: [],
		pushToast: vi.fn(),
		pushErrorToast: vi.fn(),
		pushSuccessToast: vi.fn(),
		dismissToast: vi.fn(),
	});
	mocks.useCompensationLogger.mockImplementation(() => {});
	mocks.useAiRunner.mockImplementation(() => {});
	const props: GameProviderInnerProps = {
		children: <div data-testid="child" />,
		darkMode: true,
		onToggleDark: () => {},
		devMode: false,
		musicEnabled: true,
		onToggleMusic: () => {},
		soundEnabled: true,
		onToggleSound: () => {},
		backgroundAudioMuted: true,
		onToggleBackgroundAudioMute: () => {},
		playerName: players[0]?.name ?? 'Commander',
		onChangePlayerName: () => {},
		queue: queueHelpers,
		sessionId: 'session:test',
		sessionState: sessionSnapshot,
		ruleSnapshot,
		refreshSession: async () => {},
		onReleaseSession: () => {},
		registries,
		resourceKeys,
		sessionMetadata:
			sessionState.metadata as unknown as GameProviderInnerProps['sessionMetadata'],
	} as GameProviderInnerProps;
	return props;
}

function captureContext() {
	const context = useContext(GameEngineContext);
	if (!context) {
		throw new Error('Missing GameEngineContext');
	}
	return context;
}

describe('GameProviderInner', () => {
	describe('playbook: remote adapter bridge', () => {
		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('forwards the remote session adapter to hooks and legacy context consumers', () => {
			const props = createProps();
			let capturedContext: ReturnType<typeof captureContext> | null = null;
			function ContextProbe() {
				capturedContext = captureContext();
				return <div data-testid="probe" />;
			}
			render(
				<GameProviderInner {...props}>
					<ContextProbe />
				</GameProviderInner>,
			);
			const sessionAdapter =
				mocks.useSessionQueue.mock.results[0]?.value?.session;
			expect(sessionAdapter).toBeDefined();
			expect(mocks.useSessionQueue).toHaveBeenCalledWith(
				props.queue,
				props.sessionState,
				props.sessionId,
			);
			expect(mocks.usePhaseProgress).toHaveBeenCalledWith(
				expect.objectContaining({ session: sessionAdapter }),
			);
			expect(mocks.useActionPerformer).toHaveBeenCalledWith(
				expect.objectContaining({ session: sessionAdapter }),
			);
			expect(mocks.useCompensationLogger).toHaveBeenCalledWith(
				expect.objectContaining({ session: sessionAdapter }),
			);
			expect(mocks.useAiRunner).toHaveBeenCalledWith(
				expect.objectContaining({ session: sessionAdapter }),
			);
			expect(capturedContext?.session).toBe(sessionAdapter);
		});
	});
});
