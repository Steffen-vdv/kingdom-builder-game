import { describe, it, expect, vi } from 'vitest';
import {
  createEngine,
  runEffects,
  performAction,
  advance,
} from '@kingdom-builder/engine';
import {
  ACTIONS,
  BUILDINGS,
  DEVELOPMENTS,
  POPULATIONS,
  PHASES,
  GAME_START,
} from '@kingdom-builder/contents';
import { snapshotPlayer, diffStepSnapshots } from '../src/translation/log';

vi.mock('@kingdom-builder/engine', async () => {
  return await import('../../engine/src');
});

describe('log resource sources', () => {
  it('ignores opponent mills when logging farm gains', () => {
    const ctx = createEngine({
      actions: ACTIONS,
      buildings: BUILDINGS,
      developments: DEVELOPMENTS,
      populations: POPULATIONS,
      phases: PHASES,
      start: GAME_START,
    });
    // Give opponent (Player B) a mill
    ctx.game.currentPlayerIndex = 1;
    runEffects(
      [{ type: 'building', method: 'add', params: { id: 'mill' } }],
      ctx,
    );
    ctx.game.currentPlayerIndex = 0;

    const devPhase = ctx.phases.find((p) => p.id === 'development');
    const step = devPhase?.steps.find((s) => s.id === 'gain-income');
    const before = snapshotPlayer(ctx.activePlayer, ctx);
    runEffects(step?.effects || [], ctx);
    const after = snapshotPlayer(ctx.activePlayer, ctx);
    const lines = diffStepSnapshots(before, after, step, ctx);
    expect(lines[0]).toBe('🪙 Gold +2 (10→12) (🪙+2 from 🌾)');
  });

  it('logs market bonus when taxing population', () => {
    const ctx = createEngine({
      actions: ACTIONS,
      buildings: BUILDINGS,
      developments: DEVELOPMENTS,
      populations: POPULATIONS,
      phases: PHASES,
      start: GAME_START,
    });
    runEffects(
      [{ type: 'building', method: 'add', params: { id: 'market' } }],
      ctx,
    );
    while (ctx.game.currentPhase !== 'main') advance(ctx);
    const step = { id: 'tax', effects: ctx.actions.get('tax').effects };
    const before = snapshotPlayer(ctx.activePlayer, ctx);
    performAction('tax', ctx);
    const after = snapshotPlayer(ctx.activePlayer, ctx);
    const lines = diffStepSnapshots(before, after, step, ctx);
    const goldLine = lines.find((l) => l.startsWith('🪙 Gold'));
    expect(goldLine).toMatch(/from 👥\+🏪\)$/);
  });
});
