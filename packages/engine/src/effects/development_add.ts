import type { EffectHandler } from '.';
import { runEffects } from '.';
import { applyParamsToEffects } from '../utils';

export const developmentAdd: EffectHandler = (effect, ctx, mult = 1) => {
  const id = effect.params?.id as string;
  const landId = effect.params?.landId as string;
  if (!id || !landId) throw new Error('development:add requires id and landId');
  const land = ctx.activePlayer.lands.find((l) => l.id === landId);
  if (!land) throw new Error(`Land ${landId} not found`);
  const iterations = Math.floor(mult);
  for (let i = 0; i < iterations; i++) {
    if (land.slotsUsed >= land.slotsMax)
      throw new Error(`No free slots on land ${landId}`);
    land.developments.push(id);
    land.slotsUsed += 1;
    const def = ctx.developments.get(id);
    if (def?.onBuild)
      runEffects(applyParamsToEffects(def.onBuild, { landId, id }), ctx);
  }
};
