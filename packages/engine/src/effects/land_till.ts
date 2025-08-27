import type { EffectHandler } from '.';

export const landTill: EffectHandler = (effect, ctx, mult = 1) => {
  const landId = effect.params?.['landId'] as string;
  if (!landId) throw new Error('land:till requires landId');
  const land = ctx.activePlayer.lands.find((l) => l.id === landId);
  if (!land) throw new Error(`Land ${landId} not found`);
  const max = ctx.services.rules.maxSlotsPerLand;
  for (let i = 0; i < Math.floor(mult); i++) {
    land.slotsMax = Math.min(land.slotsMax + 1, max);
  }
};
