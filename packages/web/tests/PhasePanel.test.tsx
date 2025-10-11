/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import PhasePanel from '../src/components/phases/PhasePanel';
import { createEngine, type EngineSession } from '@kingdom-builder/engine';
import {
	ACTIONS,
	BUILDINGS,
	DEVELOPMENTS,
	POPULATIONS,
	PHASES,
	GAME_START,
	RULES,
} from '@kingdom-builder/contents';
import { createTranslationContext } from '../src/translation/context';
import { snapshotEngine } from '../../engine/src/runtime/engine_snapshot';
import { selectSessionView } from '../src/state/sessionSelectors';
import { createSessionRegistries } from './helpers/sessionRegistries';

vi.mock('@kingdom-builder/engine', async () => {
	return await import('../../engine/src');
});

const ctx = createEngine({
	actions: ACTIONS,
	buildings: BUILDINGS,
	developments: DEVELOPMENTS,
	populations: POPULATIONS,
	phases: PHASES,
	start: GAME_START,
	rules: RULES,
});
const actionCostResource = ctx.actionCostResource;
const engineSnapshot = snapshotEngine(ctx);
const sessionRegistries = createSessionRegistries();
const translationContext = createTranslationContext(
	engineSnapshot,
	sessionRegistries,
	engineSnapshot.metadata,
	{
		ruleSnapshot: engineSnapshot.rules,
		passiveRecords: engineSnapshot.passiveRecords,
	},
);

type MockGame = {
	session: EngineSession;
	sessionState: typeof engineSnapshot;
	sessionView: ReturnType<typeof selectSessionView>;
	translationContext: typeof translationContext;
	ruleSnapshot: typeof engineSnapshot.rules;
	log: unknown[];
	logOverflowed: boolean;
	hoverCard: null;
	handleHoverCard: ReturnType<typeof vi.fn>;
	clearHoverCard: ReturnType<typeof vi.fn>;
	phaseSteps: unknown[];
	setPhaseSteps: ReturnType<typeof vi.fn>;
	phaseTimer: number;
	mainApStart: number;
	displayPhase: string;
	setDisplayPhase: ReturnType<typeof vi.fn>;
	phaseHistories: Record<string, unknown[]>;
	tabsEnabled: boolean;
	actionCostResource: string;
	handlePerform: ReturnType<typeof vi.fn>;
	runUntilActionPhase: ReturnType<typeof vi.fn>;
	handleEndTurn: ReturnType<typeof vi.fn>;
	updateMainPhaseStep: ReturnType<typeof vi.fn>;
	darkMode: boolean;
	onToggleDark: ReturnType<typeof vi.fn>;
	resolution: null;
	showResolution: ReturnType<typeof vi.fn>;
	acknowledgeResolution: ReturnType<typeof vi.fn>;
	musicEnabled: boolean;
	onToggleMusic: ReturnType<typeof vi.fn>;
	soundEnabled: boolean;
	onToggleSound: ReturnType<typeof vi.fn>;
	backgroundAudioMuted: boolean;
	onToggleBackgroundAudioMute: ReturnType<typeof vi.fn>;
	timeScale: number;
	setTimeScale: ReturnType<typeof vi.fn>;
	toasts: unknown[];
	pushToast: ReturnType<typeof vi.fn>;
	pushErrorToast: ReturnType<typeof vi.fn>;
	pushSuccessToast: ReturnType<typeof vi.fn>;
	dismissToast: ReturnType<typeof vi.fn>;
	playerName: string;
	onChangePlayerName: ReturnType<typeof vi.fn>;
};

const mockGame: MockGame = {
	session: {
		getActionCosts: vi.fn(),
		getActionRequirements: vi.fn(),
		getActionOptions: vi.fn(),
	} as unknown as EngineSession,
	sessionState: engineSnapshot,
	sessionView: selectSessionView(engineSnapshot, sessionRegistries),
	translationContext,
	ruleSnapshot: engineSnapshot.rules,
	log: [],
	logOverflowed: false,
	hoverCard: null,
	handleHoverCard: vi.fn(),
	clearHoverCard: vi.fn(),
	phaseSteps: [],
	setPhaseSteps: vi.fn(),
	phaseTimer: 0,
	mainApStart: 0,
	displayPhase: engineSnapshot.game.currentPhase,
	setDisplayPhase: vi.fn(),
	phaseHistories: {},
	tabsEnabled: true,
	actionCostResource,
	handlePerform: vi.fn().mockResolvedValue(undefined),
	runUntilActionPhase: vi.fn(),
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
	playerName: engineSnapshot.game.players[0]?.name ?? 'Player',
	onChangePlayerName: vi.fn(),
};

vi.mock('../src/state/GameContext', () => ({
	useGameEngine: () => mockGame,
}));

afterEach(() => {
	cleanup();
});

function prepareSessionState({
	actionPoints,
	tabsEnabled,
}: {
	actionPoints: number;
	tabsEnabled: boolean;
}) {
	const sessionState = structuredClone(engineSnapshot);
	const actionPhase = sessionState.phases.find((phase) => phase.action);
	if (actionPhase) {
		sessionState.game.currentPhase = actionPhase.id;
	}
	const activePlayer = sessionState.game.players.find(
		(player) => player.id === sessionState.game.activePlayerId,
	);
	if (activePlayer) {
		activePlayer.resources[actionCostResource] = actionPoints;
	}
	delete sessionState.game.conclusion;
	mockGame.sessionState = sessionState;
	mockGame.sessionView = selectSessionView(sessionState, sessionRegistries);
	mockGame.displayPhase = sessionState.game.currentPhase;
	mockGame.tabsEnabled = tabsEnabled;
}

describe('<PhasePanel />', () => {
	beforeEach(() => {
		mockGame.handleEndTurn.mockClear();
	});

	it('displays the current turn, active player, and phase badge', () => {
		prepareSessionState({ actionPoints: 0, tabsEnabled: true });
		render(<PhasePanel />);
		const turnText = `Turn ${mockGame.sessionState.game.turn}`;
		expect(screen.getByText(turnText)).toBeInTheDocument();
		expect(screen.getByLabelText('Active player')).toHaveTextContent(
			mockGame.sessionView.active?.name ??
				mockGame.sessionState.game.players[0]?.name ??
				'Player',
		);
		const phaseBadge = screen.getByLabelText('Current phase');
		expect(phaseBadge).toHaveTextContent(
			mockGame.sessionState.phases.find(
				(phase) => phase.id === mockGame.sessionState.game.currentPhase,
			)?.label ?? mockGame.sessionState.game.currentPhase,
		);
	});

	it('disables the Next Turn button when actions remain', () => {
		prepareSessionState({ actionPoints: 2, tabsEnabled: true });
		render(<PhasePanel />);
		expect(
			screen.getByRole('button', { name: 'Advance to the next turn' }),
		).toBeDisabled();
	});

	it('enables advancing the turn once actions are spent', () => {
		prepareSessionState({ actionPoints: 0, tabsEnabled: true });
		render(<PhasePanel />);
		const nextTurnButton = screen.getByRole('button', {
			name: 'Advance to the next turn',
		});
		expect(nextTurnButton).toBeEnabled();
		fireEvent.click(nextTurnButton);
		expect(mockGame.handleEndTurn).toHaveBeenCalledTimes(1);
	});
});
