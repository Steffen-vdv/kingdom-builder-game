import type { ResourceKey, PlayerState } from '../state';
import type { EngineContext } from '../context';
import { runEffects, type EffectDef } from '../effects';

export type HappinessTierEffect = {
  incomeMultiplier: number;
  buildingDiscountPct?: number; // 0.2 = 20%
  growthBonusPctArmy?: number;
  growthBonusPctFort?: number;
  upkeepCouncilReduction?: number; // if present, e.g., 1 instead of 2
  halveCouncilAPInUpkeep?: boolean;
  disableGrowth?: boolean;
};

export type RuleSet = {
  defaultActionAPCost: number;
  absorptionCapPct: number;
  absorptionRounding: 'down' | 'up' | 'nearest';
  happinessTiers: { threshold: number; effect: HappinessTierEffect }[];
  slotsPerNewLand: number;
  maxSlotsPerLand: number;
};

export const DefaultRules: RuleSet = {
  defaultActionAPCost: 1,
  absorptionCapPct: 1,
  absorptionRounding: 'down',
  happinessTiers: [
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
};

class HappinessService {
  constructor(private rules: RuleSet) {}
  tier(h: number): HappinessTierEffect | undefined {
    let last: HappinessTierEffect | undefined;
    for (const t of this.rules.happinessTiers)
      if (h >= t.threshold) last = t.effect;
      else break;
    return last;
  }
}

// PopCap policy (placeholder — data-driven later)
class PopCapService {
  baseCastleHouses = 1; // can be moved to config
  getCap(p: PlayerState): number {
    const housesOnLand = p.lands.reduce(
      (acc, l) => acc + l.developments.filter((d) => d === 'house').length,
      0,
    );
    return this.baseCastleHouses + housesOnLand;
  }
}

export type CostBag = { [k in ResourceKey]?: number };
export type CostModifier = (
  actionId: string,
  cost: CostBag,
  ctx: EngineContext,
) => CostBag;
export type ResultModifier = (actionId: string, ctx: EngineContext) => void;

export class PassiveManager {
  private costMods: CostModifier[] = [];
  private resultMods: ResultModifier[] = [];
  private passives: Map<string, { effects: EffectDef[] }> = new Map();

  registerCostModifier(mod: CostModifier) {
    this.costMods.push(mod);
  }
  registerResultModifier(mod: ResultModifier) {
    this.resultMods.push(mod);
  }

  applyCostMods(actionId: string, base: CostBag, ctx: EngineContext): CostBag {
    return this.costMods.reduce((acc, m) => m(actionId, acc, ctx), { ...base });
  }

  runResultMods(actionId: string, ctx: EngineContext) {
    for (const m of this.resultMods) m(actionId, ctx);
  }

  addPassive(
    passive: { id: string; effects: EffectDef[] },
    ctx: EngineContext,
  ) {
    this.passives.set(passive.id, { effects: passive.effects });
    runEffects(passive.effects, ctx);
  }

  removePassive(id: string, ctx: EngineContext) {
    const p = this.passives.get(id);
    if (!p) return;
    runEffects(p.effects.map(reverseEffect), ctx);
    this.passives.delete(id);
  }
}

function reverseEffect(e: EffectDef): EffectDef {
  if (e.effects) return { ...e, effects: e.effects.map(reverseEffect) };
  if (e.method === 'add') return { ...e, method: 'remove' };
  if (e.method === 'remove') return { ...e, method: 'add' };
  return { ...e };
}

export class Services {
  happiness: HappinessService;
  popcap: PopCapService;
  constructor(public rules: RuleSet) {
    this.happiness = new HappinessService(rules);
    this.popcap = new PopCapService();
  }
}
