import { Registry } from "../registry";
import type { EffectDef } from "../actions";
import type { EngineContext } from "../context";
import { addLand } from "./add_land";
import { addResource } from "./add_resource";
import { addBuilding } from "./add_building";

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
}

export { addLand, addResource, addBuilding };
