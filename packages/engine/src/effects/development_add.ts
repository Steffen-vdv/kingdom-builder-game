import type { EffectHandler } from '.';
import { applyParamsToEffects } from '../utils';

export const developmentAdd: EffectHandler = (effect, ctx, mult = 1) => {
  const id = effect.params?.['id'] as string;
  const landId = effect.params?.['landId'] as string;
  if (!id || !landId) throw new Error('development:add requires id and landId');
  const land = ctx.activePlayer.lands.find(
    (landItem) => landItem.id === landId,
  );
  if (!land) throw new Error(`Land ${landId} not found`);
  const iterations = Math.floor(mult);
  for (let index = 0; index < iterations; index++) {
    if (land.slotsUsed >= land.slotsMax)
      throw new Error(`No free slots on land ${landId}`);
    land.developments.push(id);
    land.slotsUsed += 1;
    const developmentDefinition = ctx.developments.get(id);
    if (developmentDefinition?.onBuild)
      ctx.passives.addPassive(
        {
          id: `${id}_${landId}`,
          effects: applyParamsToEffects(developmentDefinition.onBuild, {
            landId,
            id,
          }),
        },
        ctx,
        {
          frames: () => ({
            kind: 'development',
            id,
            longevity: 'ongoing' as const,
            dependsOn: [{ type: 'development', id }],
            removal: { type: 'development', id, detail: 'removed' },
          }),
        },
      );
  }
};
