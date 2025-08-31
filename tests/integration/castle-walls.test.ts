import { describe, it, expect } from 'vitest';
import { performAction, runEffects } from '@kingdom-builder/engine';
import {
  Resource,
  Stat,
  type StatKey,
  BUILDINGS,
} from '@kingdom-builder/contents';
import { createTestContext } from './fixtures';
import type { EffectDef } from '@kingdom-builder/engine/effects';

function getStatGain(key: StatKey): number {
  const def = BUILDINGS.get('castle_walls');
  const passive = def.onBuild?.find(
    (e) => e.type === 'passive' && e.method === 'add',
  );
  const effect = passive?.effects?.find(
    (eff): eff is EffectDef<{ key: StatKey; amount: number }> =>
      eff.type === 'stat' &&
      typeof eff.params === 'object' &&
      eff.params !== null &&
      (eff.params as { key?: unknown }).key === key &&
      typeof (eff.params as { amount?: unknown }).amount === 'number',
  );
  return effect?.params.amount ?? 0;
}

describe('Castle Walls building', () => {
  it('applies and removes stat bonuses when built and removed', () => {
    const def = BUILDINGS.get('castle_walls');
    const ctx = createTestContext();
    ctx.activePlayer.gold = def.costs[Resource.gold] ?? 0;
    ctx.activePlayer.ap = def.costs[Resource.ap] ?? 0;

    const fortGain = getStatGain(Stat.fortificationStrength);
    const absorptionGain = getStatGain(Stat.absorption);
    const fortBefore = ctx.activePlayer.stats[Stat.fortificationStrength];
    const absorptionBefore = ctx.activePlayer.stats[Stat.absorption];

    performAction('build', ctx, { id: 'castle_walls' });

    expect(ctx.activePlayer.buildings.has('castle_walls')).toBe(true);
    expect(ctx.activePlayer.stats[Stat.fortificationStrength]).toBe(
      fortBefore + fortGain,
    );
    expect(ctx.activePlayer.stats[Stat.absorption]).toBeCloseTo(
      absorptionBefore + absorptionGain,
    );

    runEffects(
      [{ type: 'building', method: 'remove', params: { id: 'castle_walls' } }],
      ctx,
    );

    expect(ctx.activePlayer.buildings.has('castle_walls')).toBe(false);
    expect(ctx.activePlayer.stats[Stat.fortificationStrength]).toBe(fortBefore);
    expect(ctx.activePlayer.stats[Stat.absorption]).toBeCloseTo(
      absorptionBefore,
    );

    runEffects(
      [{ type: 'building', method: 'remove', params: { id: 'castle_walls' } }],
      ctx,
    );

    expect(ctx.activePlayer.buildings.has('castle_walls')).toBe(false);
    expect(ctx.activePlayer.stats[Stat.fortificationStrength]).toBe(fortBefore);
    expect(ctx.activePlayer.stats[Stat.absorption]).toBeCloseTo(
      absorptionBefore,
    );
  });
});
