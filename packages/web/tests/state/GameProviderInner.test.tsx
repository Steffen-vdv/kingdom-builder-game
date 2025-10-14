/** @vitest-environment jsdom */
import React, { useContext } from 'react';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import type { SessionSnapshot } from '@kingdom-builder/protocol/session';
import {
	GameEngineContext,
	GameProviderInner,
} from '../../src/state/GameProviderInner';
import {
	createSessionCreateResponse,
	createSessionSnapshot,
	createSnapshotPlayer,
} from '../helpers/sessionFixtures';
import { createRemoteSessionAdapter } from '../helpers/createRemoteSessionAdapter';
import {
	createSessionRegistries,
	createSessionRegistriesPayload,
	createResourceKeys,
} from '../helpers/sessionRegistries';
import {
	clearSessionStateStore,
	initializeSessionState,
} from '../../src/state/sessionStateStore';
import type { TranslationContext } from '../../src/translation/context';

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

function ContextInspector() {
	const context = useContext(GameEngineContext);
	if (!context) {
		throw new Error('Missing game engine context');
	}
	return (
		<div data-testid="adapter-id">
			{(context.session as { id?: string }).id ?? ''}
		</div>
	);
}

describe('GameProviderInner', () => {
	const sessionId = 'session:test';
	let sessionState: SessionSnapshot;
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
		const phases = [
			{ id: 'phase:test', action: true, steps: [{ id: 'phase:test:start' }] },
		];
		const primary = createSnapshotPlayer({ id: 'A', name: 'Player A' });
		const opponent = createSnapshotPlayer({ id: 'B', name: 'Player B' });
		sessionState = createSessionSnapshot({
			players: [primary, opponent],
			activePlayerId: primary.id,
			opponentId: opponent.id,
			phases,
			actionCostResource: 'ap',
			ruleSnapshot: {
				tieredResourceKey: 'ap',
				tierDefinitions: [],
				winConditions: [],
			},
		});
		const response = createSessionCreateResponse({
			sessionId,
			snapshot: sessionState,
			registries: createSessionRegistriesPayload(),
		});
		initializeSessionState(response);
	});

	it('routes the remote adapter through hooks and the legacy bridge for the playbook', () => {
		const adapter = createRemoteSessionAdapter({ sessionId });
		(adapter as { id: string }).id = 'adapter:test';
		const enqueue = vi.fn(
			async <T,>(task: () => Promise<T> | T) => await task(),
		);
		useSessionQueueMock.mockReturnValue({
			adapter,
			enqueue,
			cachedSessionSnapshot: sessionState,
		});

		const { getByTestId } = render(
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
				playerName={sessionState.game.players[0]?.name ?? 'Player'}
				onChangePlayerName={() => {}}
				queue={{
					enqueue: vi.fn(),
					getCurrentSession: () => adapter,
					getLatestSnapshot: () => null,
				}}
				sessionId={sessionId}
				sessionState={sessionState}
				ruleSnapshot={sessionState.rules}
				refreshSession={async () => {}}
				onReleaseSession={() => {}}
				registries={registries}
				resourceKeys={resourceKeys}
				sessionMetadata={sessionState.metadata}
			>
				<ContextInspector />
			</GameProviderInner>,
		);

		expect(capturedPerformerOptions?.session).toBe(adapter);
		expect(capturedAiOptions?.session).toBe(adapter);
		expect(capturedPhaseOptions?.enqueue).toBe(enqueue);
		expect(capturedLoggerOptions?.sessionId).toBe(sessionId);
		expect(capturedTranslationOptions?.sessionState).toBe(sessionState);
		expect(getByTestId('adapter-id')).toHaveTextContent('adapter:test');
	});
});
