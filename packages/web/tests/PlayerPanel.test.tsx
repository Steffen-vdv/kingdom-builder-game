/** @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import PlayerPanel from '../src/components/player/PlayerPanel';
import { createEngine } from '@kingdom-builder/engine';
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

describe('<PlayerPanel />', () => {
  it('renders player name and resource icons', () => {
    render(<PlayerPanel player={ctx.activePlayer} />);
    expect(screen.getByText(ctx.activePlayer.name)).toBeInTheDocument();
    for (const [key, info] of Object.entries(RESOURCES)) {
      const amount = ctx.activePlayer.resources[key] ?? 0;
      const resourceEl = screen.getByText((content) =>
        content.startsWith(info.icon),
      );
      expect(resourceEl).toHaveTextContent(String(amount));
    }
  });
});
