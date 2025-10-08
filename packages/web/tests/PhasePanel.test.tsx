/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import PhasePanel from '../src/components/phases/PhasePanel';
import { createEngineSession } from '@kingdom-builder/engine';
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
import { selectSessionView } from '../src/state/sessionSelectors';
import type { SessionRegistries } from '../src/state/sessionSelectors.types';

vi.mock('@kingdom-builder/engine', async () => {
	return await import('../../engine/src');
});

const session = createEngineSession({
	actions: ACTIONS,
	buildings: BUILDINGS,
	developments: DEVELOPMENTS,
	populations: POPULATIONS,
	phases: PHASES,
	start: GAME_START,
	rules: RULES,
});
const sessionState = session.getSnapshot();
const ruleSnapshot = session.getRuleSnapshot();
const registries: SessionRegistries = {
	actions: ACTIONS,
	buildings: BUILDINGS,
	developments: DEVELOPMENTS,
};
const sessionView = selectSessionView(sessionState, registries);
const translationContext = createTranslationContext(
	sessionState,
	registries,
	{
		pullEffectLog: (key) => session.pullEffectLog(key),
		evaluationMods: session.getPassiveEvaluationMods(),
	},
	{
		ruleSnapshot,
		passiveRecords: sessionState.passiveRecords,
	},
);
const mockGame = {
	session,
	sessionState,
	sessionView,
	translationContext,
	ruleSnapshot,
	log: [],
	logOverflowed: false,
	hoverCard: null,
	handleHoverCard: vi.fn(),
	clearHoverCard: vi.fn(),
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
	playerName: sessionState.game.players[0]?.name ?? 'Player',
	onChangePlayerName: vi.fn(),
};

vi.mock('../src/state/GameContext', () => ({
	useGameEngine: () => mockGame,
}));

beforeAll(() => {
	Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
		value: vi.fn(),
		writable: true,
	});
});

describe('<PhasePanel />', () => {
	it('displays current turn and phases', () => {
		render(<PhasePanel />);
		const turnText = `Turn ${sessionState.game.turn}`;
		const turnElement = screen.getByText(turnText);
		const turnContainer = turnElement.closest('div');
		expect(turnContainer).toBeTruthy();
		if (turnContainer) {
			expect(
				within(turnContainer).getByText(
					sessionView.active?.name ??
						sessionState.game.players[0]?.name ??
						'Player',
				),
			).toBeInTheDocument();
		}
		const firstPhase = sessionState.phases[0]!;
		const firstPhaseButton = screen.getByRole('button', {
			name: firstPhase.label,
		});
		expect(firstPhaseButton).toBeInTheDocument();
		expect(
			within(firstPhaseButton).getByText(firstPhase.icon),
		).toBeInTheDocument();
	});
});
