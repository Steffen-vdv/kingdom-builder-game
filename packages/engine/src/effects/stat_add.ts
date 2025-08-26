import type { EffectHandler } from ".";
import type { StatKey } from "../state";

export const statAdd: EffectHandler = (effect, ctx, mult = 1) => {
  const key = effect.params!.key as StatKey;
  const amount = effect.params!.amount as number;
  ctx.activePlayer.stats[key] = (ctx.activePlayer.stats[key] || 0) + amount * mult;
};
