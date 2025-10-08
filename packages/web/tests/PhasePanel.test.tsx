/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import PhasePanel from '../src/components/phases/PhasePanel';
import { createEngine } from '@kingdom-builder/engine';
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
const translationContext = createTranslationContext(
	engineSnapshot,
	{
		actions: ACTIONS,
		buildings: BUILDINGS,
		developments: DEVELOPMENTS,
	},
	{
		pullEffectLog: (key) => ctx.pullEffectLog(key),
		evaluationMods: ctx.passives.evaluationMods,
	},
	{
		ruleSnapshot: engineSnapshot.rules,
		passiveRecords: engineSnapshot.passiveRecords,
	},
);
const mockGame = {
	ctx,
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
	displayPhase: ctx.game.currentPhase,
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
		const turnText = `Turn ${ctx.game.turn}`;
		const turnElement = screen.getByText(turnText);
		const turnContainer = turnElement.closest('div');
		expect(turnContainer).toBeTruthy();
		if (turnContainer) {
			expect(
				within(turnContainer).getByText(ctx.activePlayer.name),
			).toBeInTheDocument();
		}
		const firstPhase = ctx.phases[0];
		const firstPhaseButton = screen.getByRole('button', {
			name: firstPhase.label,
		});
		expect(firstPhaseButton).toBeInTheDocument();
		expect(
			within(firstPhaseButton).getByText(firstPhase.icon),
		).toBeInTheDocument();
	});
});
