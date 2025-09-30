/** @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import ActionsPanel from '../src/components/actions/ActionsPanel';
import { createEngine, PopulationRole, Stat } from '@kingdom-builder/engine';
import {
	RESOURCES,
	ACTIONS,
	BUILDINGS,
	DEVELOPMENTS,
	POPULATIONS,
	PHASES,
	GAME_START,
	RULES,
	POPULATION_ROLES,
	STATS,
	SLOT_INFO,
	LAND_INFO,
} from '@kingdom-builder/contents';

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
const mockGame = {
	ctx,
	log: [],
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
};

vi.mock('../src/state/GameContext', () => ({
	useGameEngine: () => mockGame,
}));

describe('<ActionsPanel />', () => {
	it('lists available actions with proper icons', () => {
		render(<ActionsPanel />);
		const apIcon = RESOURCES[actionCostResource].icon;
		expect(
			screen.getByRole('heading', {
				name: new RegExp(`Actions\\s*\\(1\\s*${apIcon}\\s*each\\)`),
			}),
		).toBeInTheDocument();
		const action = ctx.actions.entries()[0][1];
		const label = `${action.icon} ${action.name}`;
		expect(screen.getByText(label)).toBeInTheDocument();
	});

	it('shows short requirement indicator when unmet', () => {
		render(<ActionsPanel />);
		const popIcon = STATS[Stat.maxPopulation].icon;
		expect(screen.getAllByText(`Req ${popIcon}`)[0]).toBeInTheDocument();
	});

	it('shows development slot requirement indicator when no slots are free', () => {
		const originalSlots = ctx.activePlayer.lands.map((l) => l.slotsUsed);
		ctx.activePlayer.lands.forEach((l) => (l.slotsUsed = l.slotsMax));
		render(<ActionsPanel />);
		expect(screen.getAllByText(`Req ${SLOT_INFO.icon}`)[0]).toBeInTheDocument();
		expect(
			screen.getAllByTitle(
				`No ${LAND_INFO.icon} ${LAND_INFO.label} with free ${SLOT_INFO.icon} ${SLOT_INFO.label}`,
			)[0],
		).toBeInTheDocument();
		ctx.activePlayer.lands.forEach((l, i) => (l.slotsUsed = originalSlots[i]));
	});

	it('shows war weariness vs legion requirement icons when unmet', () => {
		render(<ActionsPanel />);
		const wwIcon = STATS[Stat.warWeariness].icon;
		const legIcon = POPULATION_ROLES[PopulationRole.Legion].icon;
		expect(
			screen.getAllByText(`Req ${wwIcon}${legIcon}`)[0],
		).toBeInTheDocument();
	});
});
