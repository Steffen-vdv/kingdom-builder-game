import type { EffectHandler } from '.';
import type { ResourceKey } from '../state';

export const payResource: EffectHandler = (effect, ctx) => {
  const key = effect.params!.key as ResourceKey;
  const amount = effect.params!.amount as number;
  const have = ctx.activePlayer.resources[key] || 0;
  if (have < amount) throw new Error(`Insufficient ${key}: need ${amount}, have ${have}`);
  ctx.activePlayer.resources[key] = have - amount;
};
