import { Registry } from "../registry";
import { Resource } from "../state";
import type { CostBag, PassiveManager } from "../services";
import type { EngineContext } from "../context";

export type BuildingDef = {
  id: string;
  name: string;
  costs: CostBag;
  passives?: (pm: PassiveManager, ctx: EngineContext) => void;
};

export const BUILDINGS = new Registry<BuildingDef>();

// From README: Expand costs +2 gold; grants +1 extra happiness
BUILDINGS.add("town_charter", {
  id: "town_charter",
  name: "Town Charter",
  costs: { [Resource.gold]: 5 },
  passives: (pm: PassiveManager, ctx: EngineContext) => {
    pm.registerCostModifier((actionId, costs, _ctx) => {
      if (actionId === "expand") {
        const gold = (costs[Resource.gold] || 0) + 2;
        return { ...costs, [Resource.gold]: gold };
      }
      return costs;
    });
    pm.registerResultModifier((actionId, context) => {
      if (actionId === "expand") {
        context.activePlayer.happiness += 1; // stacks after base +1
      }
    });
  },
});

// TODO: remaining buildings from original manual config
BUILDINGS.add("mill", {
  id: "mill",
  name: "Mill",
  costs: { [Resource.gold]: 7 },
  // TODO: each Farm +1 gold at income; Overwork +1 gold per Farm
});

BUILDINGS.add("raiders_guild", {
  id: "raiders_guild",
  name: "Raider's Guild",
  costs: { [Resource.gold]: 8 },
  // TODO: plunder 50%
});

BUILDINGS.add("plow_workshop", {
  id: "plow_workshop",
  name: "Plow Workshop",
  costs: { [Resource.gold]: 10 },
  // TODO: grants Plow action
});

BUILDINGS.add("market", {
  id: "market",
  name: "Market",
  costs: { [Resource.gold]: 10 },
  // TODO: Tax +1 gold per population
});

BUILDINGS.add("barracks", {
  id: "barracks",
  name: "Barracks",
  costs: { [Resource.gold]: 12 },
  // TODO: each Commander +1 additional army strength; army growth +10% per Commander
});

BUILDINGS.add("citadel", {
  id: "citadel",
  name: "Citadel",
  costs: { [Resource.gold]: 12 },
  // TODO: +5 defense; fortification growth +15% per Fortifier; +1 House
});

BUILDINGS.add("castle_walls", {
  id: "castle_walls",
  name: "Castle Walls",
  costs: { [Resource.gold]: 14 },
  // TODO: +5 defense; Absorption 20%
});

BUILDINGS.add("castle_gardens", {
  id: "castle_gardens",
  name: "Castle Gardens",
  costs: { [Resource.gold]: 15 },
  // TODO: on build -> Expand x2, Till x2, Develop Garden x2; Gardens +1 gold at income; Upkeep if happiness < 0: +1 happiness
});

BUILDINGS.add("temple", {
  id: "temple",
  name: "Temple",
  costs: { [Resource.gold]: 16 },
  // TODO: when happiness increases, gain +1 extra; +1 House; +1 gold at income
});

BUILDINGS.add("palace", {
  id: "palace",
  name: "Palace",
  costs: { [Resource.gold]: 20 },
  // TODO: end of Upkeep if happiness >=3: first action's gold cost = 0, then -1 happiness
});

BUILDINGS.add("great_hall", {
  id: "great_hall",
  name: "Great Hall",
  costs: { [Resource.gold]: 22 },
  // TODO: Till all untilled lands to 2 slots max
});
