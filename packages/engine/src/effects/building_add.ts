import type { EffectHandler } from '.';
import { runEffects } from '.';

export const buildingAdd: EffectHandler = (effect, ctx, mult = 1) => {
  const id = effect.params!['id'] as string;
  for (let index = 0; index < Math.floor(mult); index++) {
    ctx.activePlayer.buildings.add(id);
    const building = ctx.buildings.get(id);
    if (building.onBuild) runEffects(building.onBuild, ctx);
  }
};
