import { describe, it, expect, vi } from 'vitest';
import {
  createEngine,
  runEffects,
  performAction,
  advance,
  collectTriggerEffects,
} from '@kingdom-builder/engine';
import {
  ACTIONS,
  BUILDINGS,
  DEVELOPMENTS,
  POPULATIONS,
  PHASES,
  GAME_START,
  RULES,
  RESOURCES,
  Resource,
  type ResourceKey,
  ON_GAIN_INCOME_STEP,
} from '@kingdom-builder/contents';
import { snapshotPlayer, diffStepSnapshots } from '../src/translation/log';

const RESOURCE_KEYS = Object.keys(RESOURCES) as ResourceKey[];

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
      rules: RULES,
    });
    // Give opponent (Player B) a mill
    ctx.game.currentPlayerIndex = 1;
    runEffects(
      [{ type: 'building', method: 'add', params: { id: 'mill' } }],
      ctx,
    );
    ctx.game.currentPlayerIndex = 0;

    const growthPhase = ctx.phases.find((p) => p.id === 'growth');
    const step = growthPhase?.steps.find((s) => s.id === 'gain-income');
    const before = snapshotPlayer(ctx.activePlayer, ctx);
    const effects = collectTriggerEffects(ON_GAIN_INCOME_STEP, ctx);
    runEffects(effects, ctx);
    const after = snapshotPlayer(ctx.activePlayer, ctx);
    const lines = diffStepSnapshots(
      before,
      after,
      { ...step, effects } as typeof step,
      ctx,
      RESOURCE_KEYS,
    );
    const goldInfo = RESOURCES[Resource.gold];
    const farmIcon = DEVELOPMENTS.get('farm')?.icon || '';
    const b = before.resources[Resource.gold] ?? 0;
    const a = after.resources[Resource.gold] ?? 0;
    const delta = a - b;
    expect(lines[0]).toBe(
      `${goldInfo.icon} ${goldInfo.label} ${delta >= 0 ? '+' : ''}${delta} (${b}→${a}) (${goldInfo.icon}${delta >= 0 ? '+' : ''}${delta} from ${farmIcon})`,
    );
  });

  it('logs market bonus when taxing population', () => {
    const ctx = createEngine({
      actions: ACTIONS,
      buildings: BUILDINGS,
      developments: DEVELOPMENTS,
      populations: POPULATIONS,
      phases: PHASES,
      start: GAME_START,
      rules: RULES,
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
    const lines = diffStepSnapshots(before, after, step, ctx, RESOURCE_KEYS);
    const goldInfo = RESOURCES[Resource.gold];
    const populationIcon = '👥';
    const marketIcon = BUILDINGS.get('market')?.icon || '';
    const goldLine = lines.find((l) =>
      l.startsWith(`${goldInfo.icon} ${goldInfo.label}`),
    );
    expect(goldLine).toMatch(
      new RegExp(`from ${populationIcon}\\+${marketIcon}\\)$`),
    );
  });
});
