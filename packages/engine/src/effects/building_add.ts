import type { EffectHandler } from '.';
import { runEffects } from '.';

export const buildingAdd: EffectHandler = (effect, ctx, mult = 1) => {
  const id = effect.params!['id'] as string;
  for (let i = 0; i < Math.floor(mult); i++) {
    ctx.activePlayer.buildings.add(id);
    const b = ctx.buildings.get(id);
    if (b.onBuild) runEffects(b.onBuild, ctx);
  }
};
