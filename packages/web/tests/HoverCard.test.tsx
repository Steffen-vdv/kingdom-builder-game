/** @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import HoverCard from '../src/components/HoverCard';
import {
	createEngine,
	getActionCosts,
	getActionRequirements,
} from '@kingdom-builder/engine';
import {
	RESOURCES,
	ACTIONS,
	BUILDINGS,
	DEVELOPMENTS,
	POPULATIONS,
	PHASES,
	GAME_START,
	RULES,
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

const findActionWithReq = () => {
	for (const [id] of (ACTIONS as unknown as { map: Map<string, unknown> })
		.map) {
		const requirements = getActionRequirements(id, ctx);
		const costs = getActionCosts(id, ctx);
		if (
			requirements.length &&
			Object.keys(costs).some((costKey) => costKey !== actionCostResource)
		) {
			return { id, requirements, costs } as const;
		}
	}
	return { id: '', requirements: [], costs: {} } as const;
};
const actionData = findActionWithReq();
const mockGame = {
	ctx,
	log: [],
	hoverCard: null as unknown as {
		title: string;
		effects: unknown[];
		requirements: string[];
		costs?: Record<string, number>;
	} | null,
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

describe('<HoverCard />', () => {
	it('renders hover card details from context', () => {
		const { id, requirements, costs } = actionData;
		const def = ctx.actions.get(id);
		const title = `${def.icon} ${def.name}`;
		mockGame.hoverCard = {
			title,
			effects: [],
			requirements,
			costs,
		};
		render(<HoverCard />);
		expect(screen.getByText(title)).toBeInTheDocument();
		const costResource = Object.keys(costs).find(
			(costKey) => costKey !== actionCostResource,
		)!;
		const costIcon = RESOURCES[costResource].icon;
		expect(
			screen.getByText(`${costIcon}${costs[costResource]}`),
		).toBeInTheDocument();
		expect(screen.getByText(requirements[0]!)).toBeInTheDocument();
	});
});
