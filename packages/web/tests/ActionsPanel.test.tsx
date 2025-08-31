/** @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import ActionsPanel from '../src/components/actions/ActionsPanel';
import {
  createEngine,
  getActionCosts,
  PopulationRole,
  Stat,
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
  POPULATION_ROLES,
  STATS,
  SLOT_ICON,
  LAND_ICON,
  LAND_LABEL,
  SLOT_LABEL,
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
const actionCostResource = (() => {
  const reg = ACTIONS as unknown as {
    map: Map<string, { system?: boolean }>;
  };
  const first = Array.from(reg.map.entries()).find(([, a]) => !a.system);
  if (!first) return '';
  const [id] = first;
  const costs = getActionCosts(id, ctx);
  return (Object.keys(costs)[0] ?? '') as string;
})();
const mockGame = {
  ctx,
  log: [],
  hoverCard: null,
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
    expect(screen.getByText(`Actions (1 ${apIcon} each)`)).toBeInTheDocument();
    const developDef = ctx.actions.get('develop');
    const developLabel = `${developDef.icon} ${developDef.name}`;
    expect(screen.getByText(developLabel)).toBeInTheDocument();
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
    expect(screen.getAllByText(`Req ${SLOT_ICON}`)[0]).toBeInTheDocument();
    expect(
      screen.getAllByTitle(
        `No ${LAND_ICON} ${LAND_LABEL} with free ${SLOT_ICON} ${SLOT_LABEL}`,
      )[0],
    ).toBeInTheDocument();
    ctx.activePlayer.lands.forEach((l, i) => (l.slotsUsed = originalSlots[i]));
  });

  it('shows war weariness vs commander requirement icons when unmet', () => {
    render(<ActionsPanel />);
    const wwIcon = STATS[Stat.warWeariness].icon;
    const cmdIcon = POPULATION_ROLES[PopulationRole.Commander].icon;
    expect(
      screen.getAllByText(`Req ${wwIcon}${cmdIcon}`)[0],
    ).toBeInTheDocument();
  });
});
