import { Land } from '../state';
import type { EffectHandler } from '.';

interface LandAddParams {
  count?: number;
  [key: string]: unknown;
}

export const landAdd: EffectHandler<LandAddParams> = (
  effect,
  ctx,
  mult = 1,
) => {
  const count = Math.floor(Number(effect.params?.count ?? 1) * mult);
  for (let index = 0; index < count; index++) {
    const land = new Land(
      `${ctx.activePlayer.id}-L${ctx.activePlayer.lands.length + 1}`,
      ctx.services.rules.slotsPerNewLand,
    );
    ctx.activePlayer.lands.push(land);
  }
};
