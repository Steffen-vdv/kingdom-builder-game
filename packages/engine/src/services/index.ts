import type { ResourceKey, PlayerState, PlayerId } from '../state';
import type { EngineContext } from '../context';
import { runEffects, type EffectDef } from '../effects';

export type HappinessTierEffect = {
  incomeMultiplier: number;
  buildingDiscountPct?: number; // 0.2 = 20%
  growthBonusPct?: number;
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
export type ResourceGain = { key: ResourceKey; amount: number };
export type EvaluationModifier = (
  ctx: EngineContext,
  gains: ResourceGain[],
) => void;

export class PassiveManager {
  private costMods: Map<string, CostModifier> = new Map();
  private resultMods: Map<string, ResultModifier> = new Map();
  private evaluationMods: Map<string, Map<string, EvaluationModifier>> =
    new Map();
  private evaluationIndex: Map<string, string> = new Map();
  private passives: Map<
    string,
    {
      effects: EffectDef[];
      onDevelopmentPhase?: EffectDef[];
      onUpkeepPhase?: EffectDef[];
      onBeforeAttacked?: EffectDef[];
      onAttackResolved?: EffectDef[];
      owner: PlayerId;
    }
  > = new Map();

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

  registerEvaluationModifier(
    id: string,
    target: string,
    mod: EvaluationModifier,
  ) {
    if (!this.evaluationMods.has(target))
      this.evaluationMods.set(target, new Map());
    this.evaluationMods.get(target)!.set(id, mod);
    this.evaluationIndex.set(id, target);
  }
  unregisterEvaluationModifier(id: string) {
    const target = this.evaluationIndex.get(id);
    if (!target) return;
    const mods = this.evaluationMods.get(target);
    mods?.delete(id);
    if (mods && mods.size === 0) this.evaluationMods.delete(target);
    this.evaluationIndex.delete(id);
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

  runEvaluationMods(target: string, ctx: EngineContext, gains: ResourceGain[]) {
    const mods = this.evaluationMods.get(target);
    if (!mods) return;
    for (const mod of mods.values()) mod(ctx, gains);
  }

  addPassive(
    passive: {
      id: string;
      effects: EffectDef[];
      onDevelopmentPhase?: EffectDef[];
      onUpkeepPhase?: EffectDef[];
      onBeforeAttacked?: EffectDef[];
      onAttackResolved?: EffectDef[];
    },
    ctx: EngineContext,
  ) {
    const key = `${passive.id}_${ctx.activePlayer.id}`;
    this.passives.set(key, { ...passive, owner: ctx.activePlayer.id });
    runEffects(passive.effects, ctx);
  }

  removePassive(id: string, ctx: EngineContext) {
    const key = `${id}_${ctx.activePlayer.id}`;
    const passive = this.passives.get(key);
    if (!passive) return;
    runEffects(passive.effects.map(reverseEffect), ctx);
    this.passives.delete(key);
  }

  list(owner?: PlayerId) {
    if (!owner) return Array.from(this.passives.keys());
    const suffix = `_${owner}`;
    return Array.from(this.passives.keys())
      .filter((k) => k.endsWith(suffix))
      .map((k) => k.slice(0, -suffix.length));
  }

  values(owner: PlayerId) {
    const suffix = `_${owner}`;
    return Array.from(this.passives.entries())
      .filter(([k]) => k.endsWith(suffix))
      .map(([, v]) => v);
  }
}

function reverseEffect(effect: EffectDef): EffectDef {
  const reversed: EffectDef = { ...effect };
  if (effect.effects) reversed.effects = effect.effects.map(reverseEffect);
  if (effect.method === 'add') reversed.method = 'remove';
  else if (effect.method === 'remove') reversed.method = 'add';
  return reversed;
}

export class Services {
  happiness: HappinessService;
  popcap: PopCapService;
  constructor(public rules: RuleSet) {
    this.happiness = new HappinessService(rules);
    this.popcap = new PopCapService();
  }
}
