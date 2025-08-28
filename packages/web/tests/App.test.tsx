import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import React from 'react';
import App from '../src/App';

vi.mock('@kingdom-builder/engine', () => ({
  createEngine: () => ({
    activePlayer: { resources: {}, stats: {}, buildings: new Set(), lands: [] },
    actions: { map: new Map() },
    developments: { map: new Map() },
    game: { currentPhase: 'development' },
  }),
  performAction: () => {},
  runDevelopment: () => {},
  runUpkeep: () => {},
  Phase: { Development: 'development', Upkeep: 'upkeep', Main: 'main' },
}));

describe('<App />', () => {
  it('renders testlab header', () => {
    const html = renderToString(<App />);
    expect(html).toContain('testlab');
  });
});
