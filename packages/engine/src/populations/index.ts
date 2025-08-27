import { Registry } from "../registry";
import { PopulationRole, Resource, Stat } from "../state";
import { populationSchema, type PopulationConfig } from "../config/schema";

export type PopulationDef = PopulationConfig;

export function createPopulationRegistry() {
  const reg = new Registry<PopulationDef>(populationSchema);

  reg.add(PopulationRole.Council, {
    id: PopulationRole.Council,
    name: "Council",
    onDevelopmentPhase: [
      { type: "resource", method: "add", params: { key: Resource.ap, amount: 1 } },
    ],
    onUpkeepPhase: [
      { type: "resource", method: "remove", params: { key: Resource.gold, amount: 2 } },
    ],
  });

  reg.add(PopulationRole.Commander, {
    id: PopulationRole.Commander,
    name: "Army Commander",
    onDevelopmentPhase: [
      { type: "stat", method: "add_pct", params: { key: Stat.armyStrength, percent: 25 } },
    ],
    onUpkeepPhase: [
      { type: "resource", method: "remove", params: { key: Resource.gold, amount: 1 } },
    ],
  });

  reg.add(PopulationRole.Fortifier, {
    id: PopulationRole.Fortifier,
    name: "Fortifier",
    onDevelopmentPhase: [
      { type: "stat", method: "add_pct", params: { key: Stat.fortificationStrength, percent: 25 } },
    ],
    onUpkeepPhase: [
      { type: "resource", method: "remove", params: { key: Resource.gold, amount: 1 } },
    ],
  });

  reg.add(PopulationRole.Citizen, {
    id: PopulationRole.Citizen,
    name: "Citizen",
  });

  return reg;
}

export const POPULATIONS = createPopulationRegistry();
