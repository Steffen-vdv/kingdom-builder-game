import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import React from 'react';
import App from '../src/App';

vi.mock('@kingdom-builder/engine', () => {
  const player = {
    id: 'A',
    name: 'A',
    resources: {} as Record<string, number>,
    stats: { maxPopulation: 0, warWeariness: 0 } as Record<string, number>,
    population: {} as Record<string, number>,
    buildings: new Set<string>(),
    lands: [] as unknown[],
  };
  return {
    createEngine: () => ({
      activePlayer: player,
      actions: { map: new Map() },
      developments: { map: new Map() },
      buildings: { map: new Map(), get: () => undefined },
      passives: { list: () => [] },
      game: {
        currentPhase: 'growth',
        players: [player],
        currentPlayerIndex: 0,
      },
    }),
    performAction: () => {},
    runEffects: () => {},
    collectTriggerEffects: () => [],
    getActionCosts: () => ({}),
    Phase: { Growth: 'growth', Upkeep: 'upkeep', Main: 'main' },
    PHASES: [
      { id: 'growth', label: 'Growth', icon: '🏗️', steps: [] },
      { id: 'upkeep', label: 'Upkeep', icon: '🧹', steps: [] },
      { id: 'main', label: 'Main', icon: '🎯', steps: [], action: true },
    ],
    Resource: {
      gold: 'gold',
      ap: 'ap',
      happiness: 'happiness',
      castleHP: 'castleHP',
    },
  };
});

describe('<App />', () => {
  it('renders main menu', () => {
    const html = renderToString(<App />);
    expect(html).toContain('Kingdom Builder');
    expect(html).toContain('Start New Game');
  });
});
