import type { EffectHandler } from '.';

export const passiveRemove: EffectHandler = (effect, ctx, mult = 1) => {
  const id = effect.params?.['id'] as string;
  if (!id) throw new Error('passive:remove requires id');
  for (let i = 0; i < Math.floor(mult); i++) {
    ctx.passives.removePassive(id, ctx);
  }
};
