import type { EffectHandler } from '.';
import type { StatKey } from '../state';

export const statAddPct: EffectHandler = (effect, ctx, mult = 1) => {
  const key = effect.params!['key'] as StatKey;
  let pct = effect.params!['percent'] as number | undefined;
  if (pct === undefined) {
    const statKey = effect.params!['percentStat'] as StatKey;
    const statVal = ctx.activePlayer.stats[statKey] || 0;
    pct = statVal * 100;
  }

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
  let newVal = base + ctx.statAddPctAccums[cacheKey]!;
  if (effect.round === 'up')
    newVal = newVal >= 0 ? Math.ceil(newVal) : Math.floor(newVal);
  else if (effect.round === 'down')
    newVal = newVal >= 0 ? Math.floor(newVal) : Math.ceil(newVal);
  if (newVal < 0) newVal = 0;
  ctx.activePlayer.stats[key] = newVal;
  if (newVal !== 0) ctx.activePlayer.statsHistory[key] = true;
};
