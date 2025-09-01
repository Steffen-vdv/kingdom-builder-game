/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
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

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
    value: vi.fn(),
    writable: true,
  });
});

describe('<PhasePanel />', () => {
  it('displays current turn and phases', () => {
    render(<PhasePanel />);
    expect(
      screen.getByText(`Turn ${ctx.game.turn} - ${ctx.activePlayer.name}`),
    ).toBeInTheDocument();
    const firstPhase = ctx.phases[0];
    const phaseLabel = `${firstPhase.icon} ${firstPhase.label}`;
    expect(
      screen.getByRole('button', { name: phaseLabel }),
    ).toBeInTheDocument();
  });
});
