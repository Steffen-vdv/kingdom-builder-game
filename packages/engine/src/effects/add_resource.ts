import type { EffectHandler } from ".";
import type { ResourceKey } from "../state";

export const addResource: EffectHandler = (effect, ctx) => {
  const key = effect.params!.key as ResourceKey;
  const amount = effect.params!.amount as number;
  ctx.activePlayer.resources[key] = (ctx.activePlayer.resources[key] || 0) + amount;
};
