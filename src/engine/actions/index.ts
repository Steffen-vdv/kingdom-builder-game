import { Registry } from "../registry";
import { R } from "../state";
import type { CostBag } from "../services";

export type EffectDef = { type: string; params?: Record<string, any> };
export type ActionDef = {
  id: string;
  name: string;
  baseCosts?: CostBag;
  requirements?: ((ctx: import("../context").EngineContext) => true | string)[];
  effects: EffectDef[];
};

export const ACTIONS = new Registry<ActionDef>();

ACTIONS.add("expand", {
  id: "expand",
  name: "Expand",
  baseCosts: { [R.gold]: 2 },
  effects: [
    { type: "add_land", params: { count: 1 } },
    { type: "add_resource", params: { key: R.happiness, amount: 1 } },
  ],
});

// A simple build action to acquire Town Charter in tests
ACTIONS.add("build_town_charter", {
  id: "build_town_charter",
  name: "Build — Town Charter",
  baseCosts: { [R.gold]: 5 },
  effects: [ { type: "add_building", params: { id: "town_charter" } } ],
});
