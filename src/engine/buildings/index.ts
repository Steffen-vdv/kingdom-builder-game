import { Registry } from "../registry";
import { R } from "../state";
import type { CostBag, PassiveManager } from "../services";
import type { EngineContext } from "../context";

export type BuildingDef = {
  id: string;
  name: string;
  costs: CostBag;
  passives?: (pm: PassiveManager, ctx: EngineContext) => void;
};

export const BUILDINGS = new Registry<BuildingDef>();

BUILDINGS.add("town_charter", {
  id: "town_charter",
  name: "Town Charter",
  costs: { [R.gold]: 5 },
  passives: (pm: PassiveManager, ctx: EngineContext) => {
    pm.registerCostModifier((actionId, costs, _ctx) => {
      if (actionId === "expand") {
        const gold = (costs[R.gold] || 0) + 2;
        return { ...costs, [R.gold]: gold };
      }
      return costs;
    });
    pm.registerResultModifier((actionId, ctx2) => {
      if (actionId === "expand") {
        ctx2.me.happiness += 1; // stacks after base +1
      }
    });
  },
});
