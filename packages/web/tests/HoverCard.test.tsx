/** @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import HoverCard from '../src/components/HoverCard';
import {
  createEngine,
  Resource,
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
  phasePaused: false,
  setPaused: vi.fn(),
  mainApStart: 0,
  displayPhase: ctx.game.currentPhase,
  setDisplayPhase: vi.fn(),
  phaseHistories: {},
  tabsEnabled: true,
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
    const actionId = 'raise_pop';
    const actionName = ctx.actions.get(actionId)?.name || '';
    const title = `${ctx.actions.get(actionId).icon} ${actionName}`;
    const costs = getActionCosts(actionId, ctx);
    const requirements = getActionRequirements(actionId, ctx);
    mockGame.hoverCard = {
      title,
      effects: [],
      requirements,
      costs,
    };
    render(<HoverCard />);
    expect(screen.getByText(title)).toBeInTheDocument();
    const goldIcon = RESOURCES[Resource.gold].icon;
    expect(
      screen.getByText(`${goldIcon}${costs[Resource.gold]}`),
    ).toBeInTheDocument();
    expect(screen.getByText(requirements[0]!)).toBeInTheDocument();
  });
});
