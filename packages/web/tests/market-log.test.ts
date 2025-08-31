import { describe, it, expect, vi } from 'vitest';
import {
  createEngine,
  performAction,
  runEffects,
  Resource,
  PopulationRole,
} from '@kingdom-builder/engine';
import {
  ACTIONS,
  BUILDINGS,
  DEVELOPMENTS,
  POPULATIONS,
  PHASES,
  GAME_START,
  RESOURCES,
  BUILDING_INFO as buildingInfo,
} from '@kingdom-builder/contents';
import { snapshotPlayer, diffStepSnapshots } from '../src/translation/log';

vi.mock('@kingdom-builder/engine', async () => {
  return await import('../../engine/src');
});

describe('Market logging', () => {
  it('shows market bonus per population', () => {
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
    runEffects(
      [
        {
          type: 'population',
          method: 'add',
          params: { role: PopulationRole.Citizen },
        },
      ],
      ctx,
    );
    ctx.activePlayer.resources[Resource.ap] = 1;
    const before = snapshotPlayer(ctx.activePlayer, ctx);
    const beforeGold = before.resources[Resource.gold] ?? 0;
    const popCount = Object.values(ctx.activePlayer.population).reduce(
      (acc, v) => acc + Number(v || 0),
      0,
    );
    performAction('tax', ctx);
    const after = snapshotPlayer(ctx.activePlayer, ctx);
    const step = { id: 'tax', effects: ctx.actions.get('tax').effects };
    const lines = diffStepSnapshots(before, after, step, ctx);
    const goldIcon = RESOURCES[Resource.gold].icon;
    const goldLine = lines.find((l) => l.startsWith(`${goldIcon} Gold`))!;
    const afterGold = after.resources[Resource.gold] ?? 0;
    const expected = afterGold - beforeGold;
    expect(goldLine).toBe(
      `${goldIcon} Gold +${expected} (${beforeGold}→${afterGold}) (${goldIcon}+${expected} from ${'👥'.repeat(popCount)}+${buildingInfo.market.icon})`,
    );
  });
});
