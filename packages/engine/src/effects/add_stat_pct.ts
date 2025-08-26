import type { EffectHandler } from '.';
import type { StatKey } from '../state';

export const addStatPct: EffectHandler = (effect, ctx) => {
  const key = effect.params!.key as StatKey;
  const pct = effect.params!.percent as number;
  const current = ctx.activePlayer.stats[key] || 0;
  const delta = current * (pct / 100);
  ctx.activePlayer.stats[key] = current + delta;
};
