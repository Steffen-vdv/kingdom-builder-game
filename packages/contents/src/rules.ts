import type { RuleSet } from '@kingdom-builder/engine/services';
import { Resource } from './resources';

export const RULES: RuleSet = {
  defaultActionAPCost: 1,
  absorptionCapPct: 1,
  absorptionRounding: 'down',
  tieredResourceKey: Resource.happiness,
  tierDefinitions: [
    { threshold: 0, effect: { incomeMultiplier: 1 } },
    { threshold: 3, effect: { incomeMultiplier: 1.25 } },
    {
      threshold: 5,
      effect: { incomeMultiplier: 1.25, buildingDiscountPct: 0.2 },
    },
    {
      threshold: 8,
      effect: { incomeMultiplier: 1.5, buildingDiscountPct: 0.2 },
    },
  ],
  slotsPerNewLand: 1,
  maxSlotsPerLand: 2,
  basePopulationCap: 1,
};
