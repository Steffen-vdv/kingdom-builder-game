import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import React from 'react';
import App from '../src/App';

vi.mock('@kingdom-builder/engine', () => {
  const player = {
    id: 'A',
    name: 'A',
    resources: {} as Record<string, number>,
    stats: { maxPopulation: 0 } as Record<string, number>,
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
        currentPhase: 'development',
        players: [player],
        currentPlayerIndex: 0,
      },
    }),
    performAction: () => {},
    runEffects: () => {},
    collectTriggerEffects: () => [],
    getActionCosts: () => ({}),
    Phase: { Development: 'development', Upkeep: 'upkeep', Main: 'main' },
    Resource: {
      gold: 'gold',
      ap: 'ap',
      happiness: 'happiness',
      castleHP: 'castleHP',
    },
  };
});

describe('<App />', () => {
  it('renders Kingdom Builder header', () => {
    const html = renderToString(<App />);
    expect(html).toContain('Kingdom Builder');
  });
});
