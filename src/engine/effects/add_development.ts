import type { EffectHandler } from ".";
import { EFFECTS } from ".";
import type { EffectDef } from "../actions";

function runEffects(effects: EffectDef[], ctx: import("../context").EngineContext) {
  for (const e of effects) {
    const handler = EFFECTS.get(e.type);
    handler(e, ctx);
  }
}

export const addDevelopment: EffectHandler = (effect, ctx) => {
  const id = effect.params?.id as string;
  const landId = effect.params?.landId as string;
  if (!id || !landId) throw new Error("add_development requires id and landId");
  const land = ctx.activePlayer.lands.find(l => l.id === landId);
  if (!land) throw new Error(`Land ${landId} not found`);
  if (land.slotsUsed >= land.slotsMax) throw new Error(`No free slots on land ${landId}`);
  land.developments.push(id);
  land.slotsUsed += 1;
  const def = ctx.developments.get(id);
  if (def?.onBuild) runEffects(def.onBuild, ctx);
};
