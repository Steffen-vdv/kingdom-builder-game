import { rules } from './config/builders';

export const RULES = rules()
  .defaultActionAPCost(1)
  .absorptionCapPct(1)
  .absorptionRounding('down')
  .happinessTier(0, { incomeMultiplier: 1 })
  .happinessTier(3, { incomeMultiplier: 1.25 })
  .happinessTier(5, { incomeMultiplier: 1.25, buildingDiscountPct: 0.2 })
  .happinessTier(8, { incomeMultiplier: 1.5, buildingDiscountPct: 0.2 })
  .slotsPerNewLand(1)
  .maxSlotsPerLand(2)
  .basePopulationCap(1)
  .build();
