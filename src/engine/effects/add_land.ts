import { Land } from "../state";
import type { EffectHandler } from ".";

export const addLand: EffectHandler = (effect, ctx) => {
  const count = effect.params?.count ?? 1;
  for (let i = 0; i < count; i++) {
    const land = new Land(`${ctx.activePlayer.id}-L${ctx.activePlayer.lands.length + 1}`, ctx.services.rules.slotsPerNewLand);
    ctx.activePlayer.lands.push(land);
  }
};
