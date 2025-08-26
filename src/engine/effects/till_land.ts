import type { EffectHandler } from ".";

export const tillLand: EffectHandler = (effect, ctx) => {
  const landId = effect.params?.landId as string;
  if (!landId) throw new Error("till_land requires landId");
  const land = ctx.activePlayer.lands.find(l => l.id === landId);
  if (!land) throw new Error(`Land ${landId} not found`);
  const max = ctx.services.rules.maxSlotsPerLand;
  land.slotsMax = Math.min(land.slotsMax + 1, max);
};
