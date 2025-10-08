import { vi } from 'vitest';
import type {
	EngineSession,
	EngineSessionSnapshot,
	RuleSnapshot,
} from '@kingdom-builder/engine';
import { createTranslationContext } from '../../src/translation/context';
import { ACTIONS, BUILDINGS, DEVELOPMENTS } from '@kingdom-builder/contents';
import type { GameEngineContextValue } from '../../src/state/GameContext.types';
import { selectSessionView } from '../../src/state/sessionSelectors';
import type { SessionRegistries } from '../../src/state/sessionSelectors.types';

export type MockGame = GameEngineContextValue;

export type PassiveGameContext = {
	mockGame: MockGame;
	handleHoverCard: ReturnType<typeof vi.fn>;
	clearHoverCard: ReturnType<typeof vi.fn>;
};

export function createPassiveGame(
	sessionState: EngineSessionSnapshot,
	options: {
		ruleSnapshot?: RuleSnapshot;
	} = {},
): PassiveGameContext {
	const handleHoverCard = vi.fn();
	const clearHoverCard = vi.fn();
	const ruleSnapshot = options.ruleSnapshot ?? sessionState.rules;
	const translationContext = createTranslationContext(
		sessionState,
		{
			actions: ACTIONS,
			buildings: BUILDINGS,
			developments: DEVELOPMENTS,
		},
		undefined,
		{
			ruleSnapshot,
			passiveRecords: sessionState.passiveRecords,
		},
	);
	const sessionRegistries: SessionRegistries = {
		actions: ACTIONS,
		buildings: BUILDINGS,
		developments: DEVELOPMENTS,
	};
	const sessionView = selectSessionView(sessionState, sessionRegistries);
	const mockGame: MockGame = {
		session: {} as EngineSession,
		sessionState,
		sessionView,
		translationContext,
		ruleSnapshot,
		log: [],
		logOverflowed: false,
		hoverCard: null,
		handleHoverCard,
		clearHoverCard,
		phaseSteps: [],
		setPhaseSteps: vi.fn(),
		phaseTimer: 0,
		mainApStart: 0,
		displayPhase: sessionState.game.currentPhase,
		setDisplayPhase: vi.fn(),
		phaseHistories: {},
		tabsEnabled: true,
		actionCostResource: sessionState.actionCostResource,
		handlePerform: vi.fn().mockResolvedValue(undefined),
		runUntilActionPhase: vi.fn().mockResolvedValue(undefined),
		handleEndTurn: vi.fn().mockResolvedValue(undefined),
		updateMainPhaseStep: vi.fn(),
		darkMode: false,
		onToggleDark: vi.fn(),
		resolution: null,
		showResolution: vi.fn().mockResolvedValue(undefined),
		acknowledgeResolution: vi.fn(),
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
	return { mockGame, handleHoverCard, clearHoverCard };
}
