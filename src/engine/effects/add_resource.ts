import type { EffectHandler } from ".";
import type { ResourceKey } from "../state";

export const addResource: EffectHandler = (effect, ctx) => {
  const key = effect.params!.key as ResourceKey;
  const amount = effect.params!.amount as number;
  ctx.me.resources[key] = (ctx.me.resources[key] || 0) + amount;
};
