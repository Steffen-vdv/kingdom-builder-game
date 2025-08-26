import { Registry } from "../registry";
import { PopulationRole, Resource, Stat } from "../state";
import type { EffectDef } from "../actions";

export type PopulationDef = {
  id: string;
  name: string;
  onDevelopmentPhase?: EffectDef[];
  onUpkeepPhase?: EffectDef[];
};

export function createPopulationRegistry() {
  const reg = new Registry<PopulationDef>();

  reg.add(PopulationRole.Council, {
    id: PopulationRole.Council,
    name: "Council",
    onDevelopmentPhase: [
      { type: "add_resource", params: { key: Resource.ap, amount: 1 } },
    ],
    onUpkeepPhase: [
      { type: "pay_resource", params: { key: Resource.gold, amount: 2 } },
    ],
  });

  reg.add(PopulationRole.Commander, {
    id: PopulationRole.Commander,
    name: "Army Commander",
    onDevelopmentPhase: [
      { type: "add_stat_pct", params: { key: Stat.armyStrength, percent: 25 } },
    ],
    onUpkeepPhase: [
      { type: "pay_resource", params: { key: Resource.gold, amount: 1 } },
    ],
  });

  reg.add(PopulationRole.Fortifier, {
    id: PopulationRole.Fortifier,
    name: "Fortifier",
    onDevelopmentPhase: [
      { type: "add_stat_pct", params: { key: Stat.fortificationStrength, percent: 25 } },
    ],
    onUpkeepPhase: [
      { type: "pay_resource", params: { key: Resource.gold, amount: 1 } },
    ],
  });

  reg.add(PopulationRole.Citizen, {
    id: PopulationRole.Citizen,
    name: "Citizen",
  });

  return reg;
}

export const POPULATIONS = createPopulationRegistry();
