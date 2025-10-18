import { vi } from 'vitest';
import type {
	EngineSession,
	EngineSessionSnapshot,
	RuleSnapshot,
} from '@kingdom-builder/engine';
import { createTranslationContext } from '../../src/translation/context';
import type { LegacyGameEngineContextValue } from '../../src/state/GameContext.types';
import { selectSessionView } from '../../src/state/sessionSelectors';
import { createSessionRegistries } from './sessionRegistries';
import type { SessionRegistries } from '../../src/state/sessionRegistries';

export type MockGame = LegacyGameEngineContextValue;

export type PassiveGameContext = {
	mockGame: MockGame;
	handleHoverCard: ReturnType<typeof vi.fn>;
	clearHoverCard: ReturnType<typeof vi.fn>;
	registries: SessionRegistries;
	metadata: EngineSessionSnapshot['metadata'];
};

export function createPassiveGame(
	sessionState: EngineSessionSnapshot,
	options: {
		ruleSnapshot?: RuleSnapshot;
		registries?: SessionRegistries;
		metadata?: EngineSessionSnapshot['metadata'];
	} = {},
): PassiveGameContext {
	const handleHoverCard = vi.fn();
	const clearHoverCard = vi.fn();
	const ruleSnapshot = options.ruleSnapshot ?? sessionState.rules;
	const sessionRegistries = options.registries ?? createSessionRegistries();
	const sessionMetadata = options.metadata ?? sessionState.metadata;
	const translationContext = createTranslationContext(
		sessionState,
		sessionRegistries,
		sessionMetadata,
		{
			ruleSnapshot,
			passiveRecords: sessionState.passiveRecords,
		},
	);
	const sessionView = selectSessionView(sessionState, sessionRegistries);
	const controlledPlayerId =
		sessionState.game.players.find((player) => !player.aiControlled)?.id ??
		sessionState.game.activePlayerId ??
		sessionState.game.players[0]?.id ??
		null;
	const sessionStub = {
		getActionCosts: vi.fn(),
		getActionRequirements: vi.fn(),
		getActionOptions: vi.fn(),
		setActionCosts: vi.fn(),
		setActionRequirements: vi.fn(),
		setActionOptions: vi.fn(),
		hasAiController: vi.fn().mockReturnValue(false),
	} as Partial<EngineSession> as EngineSession;
	const mockGame: MockGame = {
		sessionId: 'test-session',
		sessionSnapshot: sessionState,
		cachedSessionSnapshot: sessionState,
		selectors: { sessionView },
		controlledPlayerId,
		translationContext,
		ruleSnapshot,
		log: [],
		logOverflowed: false,
		resolution: null,
		showResolution: vi.fn().mockResolvedValue(undefined),
		acknowledgeResolution: vi.fn(),
		hoverCard: null,
		handleHoverCard,
		clearHoverCard,
		phase: {
			currentPhaseId: sessionState.game.currentPhase,
			isActionPhase: Boolean(
				sessionState.phases[sessionState.game.phaseIndex]?.action,
			),
			canEndTurn: true,
			isAdvancing: false,
		},
		actionCostResource: sessionState.actionCostResource,
		requests: {
			performAction: vi.fn().mockResolvedValue(undefined),
			advancePhase: vi.fn().mockResolvedValue(undefined),
			refreshSession: vi.fn().mockResolvedValue(undefined),
		},
		metadata: {
			getRuleSnapshot: () => ruleSnapshot,
			getSessionView: () => sessionView,
			getTranslationContext: () => translationContext,
		},
		runUntilActionPhase: vi.fn().mockResolvedValue(undefined),
		refreshPhaseState: vi.fn(),
		darkMode: false,
		onToggleDark: vi.fn(),
		musicEnabled: true,
		onToggleMusic: vi.fn(),
		soundEnabled: true,
		onToggleSound: vi.fn(),
		backgroundAudioMuted: false,
		onToggleBackgroundAudioMute: vi.fn(),
		timeScale: 1,
		setTimeScale: vi.fn(),
		toasts: [],
		pushToast: vi.fn(),
		pushErrorToast: vi.fn(),
		pushSuccessToast: vi.fn(),
		dismissToast: vi.fn(),
		playerName: 'Player',
		onChangePlayerName: vi.fn(),
		session: sessionStub,
		sessionState,
		sessionView,
		handlePerform: vi.fn().mockResolvedValue(undefined),
		handleEndTurn: vi.fn().mockResolvedValue(undefined),
	};
	return {
		mockGame,
		handleHoverCard,
		clearHoverCard,
		registries: sessionRegistries,
		metadata: sessionMetadata,
	};
}
