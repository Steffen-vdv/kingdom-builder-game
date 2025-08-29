import type { EffectHandler } from '.';

export const passiveAdd: EffectHandler = (effect, ctx, mult = 1) => {
  const id = effect.params?.['id'] as string;
  if (!id) throw new Error('passive:add requires id');
  const scopedId = `${ctx.activePlayer.id}:${id}`;
  const passive = { id: scopedId, effects: effect.effects || [] };
  for (let index = 0; index < Math.floor(mult); index++) {
    ctx.passives.addPassive(passive, ctx);
  }
};
