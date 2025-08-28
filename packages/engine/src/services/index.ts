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
  tier(happiness: number): HappinessTierEffect | undefined {
    let last: HappinessTierEffect | undefined;
    for (const tier of this.rules.happinessTiers)
      if (happiness >= tier.threshold) last = tier.effect;
      else break;
    return last;
  }
}

// PopCap policy (placeholder — data-driven later)
class PopCapService {
  baseCastleHouses = 1; // can be moved to config
  getCap(player: PlayerState): number {
    const housesOnLand = player.lands.reduce(
      (acc, land) =>
        acc +
        land.developments.filter((development) => development === 'house')
          .length,
      0,
    );
    return this.baseCastleHouses + housesOnLand;
  }
}

export type CostBag = { [resourceKey in ResourceKey]?: number };
export type CostModifier = (
  actionId: string,
  cost: CostBag,
  ctx: EngineContext,
) => CostBag;
export type ResultModifier = (actionId: string, ctx: EngineContext) => void;

export class PassiveManager {
  private costMods: Map<string, CostModifier> = new Map();
  private resultMods: Map<string, ResultModifier> = new Map();
  private passives: Map<string, { effects: EffectDef[] }> = new Map();

  registerCostModifier(id: string, mod: CostModifier) {
    this.costMods.set(id, mod);
  }
  unregisterCostModifier(id: string) {
    this.costMods.delete(id);
  }
  registerResultModifier(id: string, mod: ResultModifier) {
    this.resultMods.set(id, mod);
  }
  unregisterResultModifier(id: string) {
    this.resultMods.delete(id);
  }

  applyCostMods(actionId: string, base: CostBag, ctx: EngineContext): CostBag {
    let acc: CostBag = { ...base };
    for (const modifier of this.costMods.values())
      acc = modifier(actionId, acc, ctx);
    return acc;
  }

  runResultMods(actionId: string, ctx: EngineContext) {
    for (const modifier of this.resultMods.values()) modifier(actionId, ctx);
  }

  addPassive(
    passive: { id: string; effects: EffectDef[] },
    ctx: EngineContext,
  ) {
    this.passives.set(passive.id, { effects: passive.effects });
    runEffects(passive.effects, ctx);
  }

  removePassive(id: string, ctx: EngineContext) {
    const passive = this.passives.get(id);
    if (!passive) return;
    runEffects(passive.effects.map(reverseEffect), ctx);
    this.passives.delete(id);
  }
}

function reverseEffect(effect: EffectDef): EffectDef {
  if (effect.effects)
    return { ...effect, effects: effect.effects.map(reverseEffect) };
  if (effect.method === 'add') return { ...effect, method: 'remove' };
  if (effect.method === 'remove') return { ...effect, method: 'add' };
  return { ...effect };
}

export class Services {
  happiness: HappinessService;
  popcap: PopCapService;
  constructor(public rules: RuleSet) {
    this.happiness = new HappinessService(rules);
    this.popcap = new PopCapService();
  }
}
