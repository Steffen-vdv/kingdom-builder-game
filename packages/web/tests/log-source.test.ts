import { describe, it, expect, vi } from 'vitest';
import { createEngine, runEffects } from '@kingdom-builder/engine';
import { Resource } from '@kingdom-builder/engine/state';
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

  it('shows player B ap compensation separately', () => {
    const ctx = createEngine({
      actions: ACTIONS,
      buildings: BUILDINGS,
      developments: DEVELOPMENTS,
      populations: POPULATIONS,
      phases: PHASES,
      start: GAME_START,
    });
    ctx.game.currentPlayerIndex = 1;
    const devPhase = ctx.phases.find((p) => p.id === 'development');
    const step = devPhase?.steps.find((s) => s.id === 'gain-ap');
    const councilAP = Number(
      step?.effects?.[0]?.effects?.find(
        (e) =>
          e.type === 'resource' &&
          e.method === 'add' &&
          (e as { params: { key: string } }).params.key === Resource.ap,
      )?.params.amount ?? 0,
    );
    const before = snapshotPlayer(ctx.activePlayer, ctx);
    runEffects(step?.effects || [], ctx);
    const bonus = ctx.compensations.B.resources?.ap || 0;
    if (bonus)
      runEffects(
        [
          {
            type: 'resource',
            method: 'add',
            params: { key: Resource.ap, amount: bonus },
          },
        ],
        ctx,
      );
    const after = snapshotPlayer(ctx.activePlayer, ctx);
    const lines = diffStepSnapshots(before, after, step, ctx);
    expect(lines).toEqual([
      `⚡ Action Points +${councilAP} (0→${councilAP}) (⚡+${councilAP} from ⚖️)`,
      `⚡ Action Points +${bonus} (${councilAP}→${councilAP + bonus}) (last-player compensation)`,
    ]);
  });
});
