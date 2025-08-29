import type { EffectHandler } from '.';

export const passiveRemove: EffectHandler = (effect, ctx, mult = 1) => {
  const id = effect.params?.['id'] as string;
  if (!id) throw new Error('passive:remove requires id');
  const scopedId = `${ctx.activePlayer.id}:${id}`;
  for (let index = 0; index < Math.floor(mult); index++) {
    ctx.passives.removePassive(scopedId, ctx);
  }
};
