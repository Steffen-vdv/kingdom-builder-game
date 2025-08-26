import { Registry } from "../registry";
import type { EffectDef } from "../actions";
import type { EngineContext } from "../context";
import { addLand } from "./add_land";
import { addResource } from "./add_resource";
import { addBuilding } from "./add_building";
import { addStat } from "./add_stat";
import { addDevelopment } from "./add_development";
import { payResource } from "./pay_resource";
import { addStatPct } from "./add_stat_pct";

export interface EffectHandler {
  (effect: EffectDef, ctx: EngineContext): void;
}

export class EffectRegistry extends Registry<EffectHandler> {}

export const EFFECTS = new EffectRegistry();

// Registers the core engine effects. Should be called during engine bootstrap.
export function registerCoreEffects(registry: EffectRegistry = EFFECTS) {
  registry.add("add_land", addLand);
  registry.add("add_resource", addResource);
  registry.add("add_building", addBuilding);
  registry.add("add_stat", addStat);
  registry.add("add_stat_pct", addStatPct);
  registry.add("add_development", addDevelopment);
  registry.add("pay_resource", payResource);
}

export { addLand, addResource, addBuilding, addStat, addDevelopment, payResource, addStatPct };
