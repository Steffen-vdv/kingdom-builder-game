import type { EffectHandler } from '.';
import type { StatKey } from '../state';

export const addStat: EffectHandler = (effect, ctx) => {
  const key = effect.params!.key as StatKey;
  const amount = effect.params!.amount as number;
  ctx.activePlayer.stats[key] = (ctx.activePlayer.stats[key] || 0) + amount;
};
