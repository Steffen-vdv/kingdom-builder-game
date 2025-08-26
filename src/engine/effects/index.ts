import { Registry } from "../registry";
import type { EngineContext } from "../context";
import { EVALUATORS } from "../evaluators";
import { landAdd } from "./land_add";
import { resourceAdd } from "./resource_add";
import { resourceRemove } from "./resource_remove";
import { buildingAdd } from "./building_add";
import { statAdd } from "./stat_add";
import { statAddPct } from "./stat_add_pct";
import { developmentAdd } from "./development_add";
import { landTill } from "./land_till";

export interface EffectDef {
  type?: string;
  method?: string;
  params?: Record<string, any>;
  effects?: EffectDef[];
  evaluator?: import("../evaluators").EvaluatorDef;
  round?: "up" | "down";
}

export interface EffectHandler {
  (effect: EffectDef, ctx: EngineContext, mult: number): void;
}

export class EffectRegistry extends Registry<EffectHandler> {}
export const EFFECTS = new EffectRegistry();

export function registerCoreEffects(registry: EffectRegistry = EFFECTS) {
  registry.add("land:add", landAdd);
  registry.add("resource:add", resourceAdd);
  registry.add("resource:remove", resourceRemove);
  registry.add("building:add", buildingAdd);
  registry.add("stat:add", statAdd);
  registry.add("stat:add_pct", statAddPct);
  registry.add("development:add", developmentAdd);
  registry.add("land:till", landTill);
}

export function runEffects(effects: EffectDef[], ctx: EngineContext, mult = 1) {
  for (const e of effects) {
    if (e.evaluator) {
      const ev = EVALUATORS.get(e.evaluator.type);
      const count = ev(e.evaluator, ctx);
      runEffects(e.effects || [], ctx, mult * (count as number));
    } else if (e.type && e.method) {
      const handler = EFFECTS.get(`${e.type}:${e.method}`);
      handler(e, ctx, mult);
    }
  }
}

export {
  landAdd,
  resourceAdd,
  resourceRemove,
  buildingAdd,
  statAdd,
  statAddPct,
  developmentAdd,
  landTill,
};
