import type { EffectHandler } from '.';

export const developmentRemove: EffectHandler = (effect, ctx, mult = 1) => {
  const id = effect.params?.id as string;
  const landId = effect.params?.landId as string;
  if (!id || !landId)
    throw new Error('development:remove requires id and landId');
  const land = ctx.activePlayer.lands.find((l) => l.id === landId);
  if (!land) throw new Error(`Land ${landId} not found`);
  const iterations = Math.floor(mult);
  for (let i = 0; i < iterations; i++) {
    const idx = land.developments.indexOf(id);
    if (idx === -1) break;
    land.developments.splice(idx, 1);
    land.slotsUsed = Math.max(0, land.slotsUsed - 1);
  }
};
