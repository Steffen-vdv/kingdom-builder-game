/** @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import ActionsPanel from '../src/components/actions/ActionsPanel';
import { createEngine, getActionRequirements } from '@kingdom-builder/engine';
import {
	ACTIONS,
	BUILDINGS,
	DEVELOPMENTS,
	POPULATIONS,
	PHASES,
	RESOURCES,
	RULES,
	SLOT_INFO,
	POPULATION_ROLES,
	PopulationRole,
	STATS,
	Stat,
} from '@kingdom-builder/contents';
import { summarizeContent } from '../src/translation';
import { cloneStart, SYNTHETIC_IDS } from './syntheticContent';

vi.mock('@kingdom-builder/engine', async () => {
	return await import('../../engine/src');
});
vi.mock(
	'@kingdom-builder/contents',
	async () => (await import('./syntheticContent')).syntheticModule,
);

const ctx = createEngine({
	actions: ACTIONS,
	buildings: BUILDINGS,
	developments: DEVELOPMENTS,
	populations: POPULATIONS,
	phases: PHASES,
	start: cloneStart(),
	rules: RULES,
});
ctx.activePlayer.actions.add(SYNTHETIC_IDS.actions.harvest);
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
		const action = ctx.actions.get(SYNTHETIC_IDS.actions.harvest);
		const label = `${action.icon} ${action.name}`;
		expect(screen.getByText(label)).toBeInTheDocument();
	});

	it('shows short requirement indicator when unmet', () => {
		render(<ActionsPanel />);
		const warIcon = STATS[Stat.warWeariness].icon;
		const legionIcon = POPULATION_ROLES[PopulationRole.Legion].icon;
		expect(
			screen.getAllByText(
				(content) =>
					typeof content === 'string' &&
					content.includes('Req') &&
					content.includes(warIcon) &&
					content.includes(legionIcon),
			)[0],
		).toBeInTheDocument();
	});

	it('shows development slot requirement indicator when no slots are free', () => {
		const originalSlots = ctx.activePlayer.lands.map((l) => l.slotsUsed);
		ctx.activePlayer.lands.forEach((l) => (l.slotsUsed = l.slotsMax));
		render(<ActionsPanel />);
		const cultivateSummary = summarizeContent(
			'action',
			SYNTHETIC_IDS.actions.cultivate,
			ctx,
		);
		const slotRequirement = cultivateSummary.find(
			(entry): entry is string =>
				typeof entry === 'string' && entry.includes(SLOT_INFO.icon),
		);
		expect(slotRequirement).toBeDefined();
		expect(screen.getAllByText(slotRequirement ?? '')[0]).toBeInTheDocument();
		const requirementMessages = getActionRequirements(
			SYNTHETIC_IDS.actions.cultivate,
			ctx,
		);
		requirementMessages.forEach((message) => {
			expect(screen.getAllByTitle(message)[0]).toBeInTheDocument();
		});
		ctx.activePlayer.lands.forEach((l, i) => (l.slotsUsed = originalSlots[i]));
	});

	it('shows war weariness vs legion requirement icons when unmet', () => {
		render(<ActionsPanel />);
		const wwIcon = STATS[Stat.warWeariness].icon;
		const legIcon = POPULATION_ROLES[PopulationRole.Legion].icon;
		expect(
			screen.getAllByText(
				(content) =>
					typeof content === 'string' &&
					content.includes('Req') &&
					content.includes(wwIcon) &&
					content.includes(legIcon),
			)[0],
		).toBeInTheDocument();
	});
});
