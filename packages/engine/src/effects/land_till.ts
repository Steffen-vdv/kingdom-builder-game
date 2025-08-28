import type { EffectHandler } from '.';

export const landTill: EffectHandler = (effect, ctx, mult = 1) => {
  const landId = effect.params?.['landId'] as string;
  if (!landId) throw new Error('land:till requires landId');
  const land = ctx.activePlayer.lands.find(
    (landState) => landState.id === landId,
  );
  if (!land) throw new Error(`Land ${landId} not found`);
  const max = ctx.services.rules.maxSlotsPerLand;
  for (let index = 0; index < Math.floor(mult); index++) {
    land.slotsMax = Math.min(land.slotsMax + 1, max);
  }
};
