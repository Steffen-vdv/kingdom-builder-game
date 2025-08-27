import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import React from 'react';
import App from '../src/App';

vi.mock('@kingdom-builder/engine', () => ({
  createEngine: () => ({
    actions: { map: new Map([['stub', { id: 'stub', name: 'Stub' }]]) },
    game: {
      currentPhase: 'development',
      active: {
        resources: { gold: 0, ap: 0, happiness: 0, castleHP: 10 },
        stats: {
          maxPopulation: 1,
          armyStrength: 0,
          fortificationStrength: 0,
          absorption: 0,
        },
        buildings: new Set<string>(),
        lands: [],
        population: {},
      },
    },
    populations: new Map(),
    developments: new Map(),
    buildings: new Map(),
  }),
  performAction: vi.fn(),
  Phase: { Development: 'development', Upkeep: 'upkeep', Main: 'main' },
  runEffects: vi.fn(),
  applyParamsToEffects: vi.fn(),
}));

describe('<App />', () => {
  it('renders testlab header and phase button', () => {
    const html = renderToString(<App />);
    expect(html).toContain('testlab');
    expect(html).toContain('next phase');
  });
});
