import { vi } from 'vitest';
import type {
	SessionRuleSnapshot,
	SessionSnapshot,
} from '@kingdom-builder/protocol/session';
import { createTranslationContext } from '../../src/translation/context';
import type { GameEngineContextValue } from '../../src/state/GameContext.types';
import { selectSessionView } from '../../src/state/sessionSelectors';
import { createSessionRegistries } from './sessionRegistries';
import type { SessionRegistries } from '../../src/state/sessionRegistries';
import { createMockSessionAdapter } from './mockSessionAdapter';

export type MockGame = GameEngineContextValue;

export type PassiveGameContext = {
	mockGame: MockGame;
	handleHoverCard: ReturnType<typeof vi.fn>;
	clearHoverCard: ReturnType<typeof vi.fn>;
	registries: SessionRegistries;
	metadata: SessionSnapshot['metadata'];
	adapter: ReturnType<typeof createMockSessionAdapter>;
};

export function createPassiveGame(
	sessionState: SessionSnapshot,
	options: {
		ruleSnapshot?: SessionRuleSnapshot;
		registries?: SessionRegistries;
		metadata?: SessionSnapshot['metadata'];
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
	const adapter = createMockSessionAdapter(sessionState);
	const mockGame: MockGame = {
		sessionId: 'test-session',
		sessionSnapshot: sessionState,
		cachedSessionSnapshot: sessionState,
		selectors: { sessionView },
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
			activePlayerId: sessionState.game.activePlayerId,
			activePlayerName:
				sessionState.game.players.find(
					(player) => player.id === sessionState.game.activePlayerId,
				)?.name ?? null,
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
	};
	return {
		mockGame,
		handleHoverCard,
		clearHoverCard,
		registries: sessionRegistries,
		metadata: sessionMetadata,
		adapter,
	};
}
