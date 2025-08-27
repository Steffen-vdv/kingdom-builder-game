import type { EffectHandler } from '.';

export const passiveAdd: EffectHandler = (effect, ctx, mult = 1) => {
  const id = effect.params?.id as string;
  if (!id) throw new Error('passive:add requires id');
  const passive = { id, effects: effect.effects || [] };
  for (let i = 0; i < Math.floor(mult); i++) {
    ctx.passives.addPassive(passive, ctx);
  }
};
