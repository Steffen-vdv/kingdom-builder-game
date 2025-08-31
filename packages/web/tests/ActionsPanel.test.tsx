/** @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import ActionsPanel from '../src/components/actions/ActionsPanel';
import { createEngine, Resource } from '@kingdom-builder/engine';
import {
  RESOURCES,
  ACTION_INFO,
  ACTIONS,
  BUILDINGS,
  DEVELOPMENTS,
  POPULATIONS,
  PHASES,
  GAME_START,
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
});
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

describe('<ActionsPanel />', () => {
  it('lists available actions with proper icons', () => {
    render(<ActionsPanel />);
    const apIcon = RESOURCES[Resource.ap].icon;
    expect(screen.getByText(`Actions (1 ${apIcon} each)`)).toBeInTheDocument();
    const developName = ctx.actions.get('develop')?.name || '';
    const developLabel = `${ACTION_INFO['develop'].icon} ${developName}`;
    expect(screen.getByText(developLabel)).toBeInTheDocument();
  });
});
