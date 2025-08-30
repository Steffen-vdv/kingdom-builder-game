/** @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import PlayerPanel from '../src/components/player/PlayerPanel';
import { createEngine, Resource, RESOURCES } from '@kingdom-builder/engine';

vi.mock('@kingdom-builder/engine', async () => {
  return await import('../../engine/src');
});

const ctx = createEngine();
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
  handlePerform: vi.fn(),
  runUntilActionPhase: vi.fn(),
  handleEndTurn: vi.fn(),
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
    const goldIcon = RESOURCES[Resource.gold].icon;
    const goldAmount = ctx.activePlayer.resources[Resource.gold];
    expect(screen.getByText(`${goldIcon}${goldAmount}`)).toBeInTheDocument();
  });
});
