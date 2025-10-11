/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
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
import type { PhaseStep } from '../src/state/GameContext.types';

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
const sessionView = selectSessionView(engineSnapshot, sessionRegistries);
const translationContext = createTranslationContext(
	engineSnapshot,
	sessionRegistries,
	engineSnapshot.metadata,
	{
		ruleSnapshot: engineSnapshot.rules,
		passiveRecords: engineSnapshot.passiveRecords,
	},
);
const actionPhaseDefinition = engineSnapshot.phases.find(
	(phase) => phase.action,
);
if (!actionPhaseDefinition) {
	throw new Error('Action phase definition not found.');
}

const mockGame = {
	session: {
		getActionCosts: vi.fn(),
		getActionRequirements: vi.fn(),
		getActionOptions: vi.fn(),
	} as unknown as EngineSession,
	sessionState: engineSnapshot,
	sessionView,
	translationContext,
	ruleSnapshot: engineSnapshot.rules,
	log: [],
	logOverflowed: false,
	hoverCard: null,
	handleHoverCard: vi.fn(),
	clearHoverCard: vi.fn(),
	phaseSteps: [] as PhaseStep[],
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

type MockGame = typeof mockGame;

vi.mock('../src/state/GameContext', () => ({
	useGameEngine: () => mockGame as MockGame,
}));

beforeEach(() => {
	mockGame.tabsEnabled = true;
	mockGame.phaseSteps = [];
	mockGame.sessionState = {
		...engineSnapshot,
		game: {
			...engineSnapshot.game,
			currentPhase: actionPhaseDefinition.id,
		},
	} as typeof engineSnapshot;
	mockGame.displayPhase = actionPhaseDefinition.id;
	(mockGame.handleEndTurn as ReturnType<typeof vi.fn>).mockClear();
});

afterEach(() => {
	cleanup();
});

describe('<PhasePanel />', () => {
	it('displays the current turn, active player, and phase badge', () => {
		render(<PhasePanel />);
		const playerName =
			sessionView.active?.name ??
			engineSnapshot.game.players[0]?.name ??
			'Player';
		expect(
			screen.getByText(`Turn ${mockGame.sessionState.game.turn}`),
		).toBeInTheDocument();
		expect(screen.getByText(playerName)).toBeInTheDocument();
		expect(
			screen.getByLabelText(`Current phase: ${actionPhaseDefinition.label}`),
		).toBeInTheDocument();
	});

	it('hides the Next Turn button when the action phase is not active', () => {
		mockGame.tabsEnabled = false;
		render(<PhasePanel />);
		expect(
			screen.queryByRole('button', { name: 'Next Turn' }),
		).not.toBeInTheDocument();
	});

	it('disables the Next Turn button while steps remain active', () => {
		mockGame.phaseSteps = [
			{
				title: 'Spend resources',
				items: [{ text: '1/3 spent' }],
				active: true,
			},
		];
		render(<PhasePanel />);
		const button = screen.getByRole('button', { name: 'Next Turn' });
		expect(button).toBeDisabled();
	});

	it('enables the Next Turn button when all steps are complete', () => {
		mockGame.phaseSteps = [
			{
				title: 'Spend resources',
				items: [{ text: '3/3 spent', done: true }],
				active: false,
			},
		];
		render(<PhasePanel />);
		const button = screen.getByRole('button', { name: 'Next Turn' });
		expect(button).toBeEnabled();
	});
});
