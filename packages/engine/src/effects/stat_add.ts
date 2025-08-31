import type { EffectHandler } from '.';
import type { StatKey } from '../state';

export const statAdd: EffectHandler = (effect, ctx, mult = 1) => {
  const key = effect.params!['key'] as StatKey;
  const amount = effect.params!['amount'] as number;
  const newVal = (ctx.activePlayer.stats[key] || 0) + amount * mult;
  ctx.activePlayer.stats[key] = newVal;
  if (newVal !== 0) ctx.activePlayer.statsHistory[key] = true;
};
