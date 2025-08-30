import { describe, it, expect, vi } from 'vitest';
import { isActionPhaseActive } from '../src/Game';

vi.mock('@kingdom-builder/engine', async () => {
  return await import('../../engine/src');
});

// Ensure actions remain enabled when viewing previous phase history.
// Specifically, current phase is main, but tabs display a prior phase.

describe('isActionPhaseActive', () => {
  it('returns true when game is in action phase regardless of display phase', () => {
    expect(isActionPhaseActive('main', 'main', true)).toBe(true);
  });

  it('returns false when not in action phase', () => {
    expect(isActionPhaseActive('development', 'main', true)).toBe(false);
  });
});
