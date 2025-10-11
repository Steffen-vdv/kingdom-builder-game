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
import type { SessionRegistries } from '../src/state/sessionContent';

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
const sessionRegistries: SessionRegistries = {
	actions: ACTIONS,
	buildings: BUILDINGS,
	developments: DEVELOPMENTS,
};
const sessionView = selectSessionView(engineSnapshot, sessionRegistries);
const translationContext = createTranslationContext(
	engineSnapshot,
	{
		actions: ACTIONS,
		buildings: BUILDINGS,
		developments: DEVELOPMENTS,
	},
	engineSnapshot.metadata,
	{
		ruleSnapshot: engineSnapshot.rules,
		passiveRecords: engineSnapshot.passiveRecords,
	},
);
const currentPhaseLabel =
	engineSnapshot.phases[engineSnapshot.game.phaseIndex]?.label ??
	engineSnapshot.game.currentPhase;
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
	phase: {
		currentPhaseId: engineSnapshot.game.currentPhase,
		isActionPhase: Boolean(
			engineSnapshot.phases[engineSnapshot.game.phaseIndex]?.action,
		),
		canEndTurn: true,
		isAdvancing: false,
	},
	actionCostResource,
	handlePerform: vi.fn().mockResolvedValue(undefined),
	runUntilActionPhase: vi.fn(),
	handleEndTurn: vi.fn().mockResolvedValue(undefined),
	refreshPhaseState: vi.fn(),
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

const defaultPhase = {
	currentPhaseId: engineSnapshot.game.currentPhase,
	isActionPhase: Boolean(
		engineSnapshot.phases[engineSnapshot.game.phaseIndex]?.action,
	),
	canEndTurn: true,
	isAdvancing: false,
};

beforeEach(() => {
	mockGame.phase = { ...defaultPhase };
	mockGame.handleEndTurn.mockClear();
});

afterEach(() => {
	cleanup();
});

describe('<PhasePanel />', () => {
	it('displays the turn indicator and current phase badge', () => {
		render(<PhasePanel />);
		expect(
			screen.getByText(`Turn ${engineSnapshot.game.turn}`),
		).toBeInTheDocument();
		expect(
			screen.getByText(
				sessionView.active?.name ??
					engineSnapshot.game.players[0]?.name ??
					'Player',
			),
		).toBeInTheDocument();
		const phaseBadge = screen.getByRole('status');
		expect(phaseBadge).toHaveTextContent('Current Phase');
		expect(phaseBadge).toHaveTextContent(currentPhaseLabel);
	});

	it('invokes the end turn handler when allowed', () => {
		mockGame.phase = {
			...defaultPhase,
			canEndTurn: true,
			isAdvancing: false,
		};
		render(<PhasePanel />);
		const nextTurnButton = screen.getByRole('button', {
			name: /next turn/i,
		});
		expect(nextTurnButton).toBeEnabled();
		fireEvent.click(nextTurnButton);
		expect(mockGame.handleEndTurn).toHaveBeenCalledTimes(1);
	});

	it('disables the Next Turn button when ending the turn is blocked', () => {
		mockGame.phase = {
			...defaultPhase,
			canEndTurn: false,
		};
		render(<PhasePanel />);
		expect(screen.getByRole('button', { name: /next turn/i })).toBeDisabled();
	});

	it('disables the Next Turn button while phases advance', () => {
		mockGame.phase = {
			...defaultPhase,
			isAdvancing: true,
		};
		render(<PhasePanel />);
		expect(screen.getByRole('button', { name: /next turn/i })).toBeDisabled();
	});
});
