import type { EffectHandler } from ".";

export const addBuilding: EffectHandler = (effect, ctx) => {
  const id = effect.params!.id as string;
  ctx.me.buildings.add(id);
  const b = ctx.buildings.get(id);
  b.passives?.(ctx.passives, ctx);
};
