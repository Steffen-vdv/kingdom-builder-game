import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import React from 'react';
import Game from '../src/screens/Game';

// Render the application with the real engine to ensure that
// dynamic action effects (e.g. build with "$id") don't crash
// the rendering pipeline when summarized.
vi.mock('@kingdom-builder/engine', async () => {
  // Re-export the actual engine source since vitest doesn't resolve the monorepo alias
  return await import('../../engine/src');
});
describe('<Game /> integration', () => {
  it('renders without crashing', () => {
    expect(() => renderToString(<Game />)).not.toThrow();
  });
});
