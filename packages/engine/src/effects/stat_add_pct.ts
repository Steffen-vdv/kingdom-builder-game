import type { EffectHandler } from '.';
import type { StatKey } from '../state';

export const statAddPct: EffectHandler = (effect, ctx, mult = 1) => {
  const key = effect.params!['key'] as StatKey;
  const pct = effect.params!['percent'] as number;

  // Use a cache keyed by turn/phase/step so multiple evaluations in the
  // same step (e.g. multiple commanders) scale additively from the
  // original stat value rather than compounding.
  const cacheKey = `${ctx.game.turn}:${ctx.game.currentPhase}:${ctx.game.currentStep}:${key}`;
  if (!(cacheKey in ctx.statAddPctBases)) {
    ctx.statAddPctBases[cacheKey] = ctx.activePlayer.stats[key] || 0;
    ctx.statAddPctAccums[cacheKey] = 0;
  }

  const base = ctx.statAddPctBases[cacheKey]!;
  ctx.statAddPctAccums[cacheKey]! += base * (pct / 100) * mult;
  ctx.activePlayer.stats[key] = base + ctx.statAddPctAccums[cacheKey]!;
};
