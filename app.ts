import React, { useEffect, useState } from "react";

/**
 * KB Engine — Step A+B Runner (React)
 * ------------------------------------------------------------
 * This single file contains a minimal, extensible core (Step A infra)
 * + a proof slice (Step B): Action "expand" and Building "town_charter".
 * It also runs a few console-visible tests on mount.
 */

// =============================
// Utilities
// =============================

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

// =============================
// Resource Registry (string-keyed)
// =============================

type ResourceKey = string; // e.g., "gold", "ap", "happiness", "castleHP", extendable later

const R = {
  gold: "gold",
  ap: "ap",
  happiness: "happiness",
  castleHP: "castleHP",
} as const;

// =============================
// Phases, Roles, etc. (light enums)
// =============================

const Phase = {
  Development: "development",
  Upkeep: "upkeep",
  Main: "main",
} as const;

type PhaseId = typeof Phase[keyof typeof Phase];

const Role = {
  Council: "council",
  Commander: "commander",
  Fortifier: "fortifier",
  Citizen: "citizen",
} as const;

type RoleId = typeof Role[keyof typeof Role];

// =============================
// RuleSet & Config
// =============================

type HappinessTierEffect = {
  incomeMultiplier: number;
  buildingDiscountPct?: number; // 0.2 = 20%
  growthBonusPctArmy?: number;
  growthBonusPctFort?: number;
  upkeepCouncilReduction?: number; // if present, e.g., 1 instead of 2
  halveCouncilAPInUpkeep?: boolean;
  disableGrowth?: boolean;
};

type RuleSet = {
  defaultActionAPCost: number;
  apPerCouncil: number;
  absorptionCapPct: number; // not used in step B, infra readiness
  absorptionRounding: "down" | "up" | "nearest";
  happinessTiers: { threshold: number; effect: HappinessTierEffect }[]; // ascending
  slotsPerNewLand: number;
  maxSlotsPerLand: number;
};

const DefaultRules: RuleSet = {
  defaultActionAPCost: 1,
  apPerCouncil: 1,
  absorptionCapPct: 1,
  absorptionRounding: "down",
  happinessTiers: [
    { threshold: 0, effect: { incomeMultiplier: 1 } },
    { threshold: 3, effect: { incomeMultiplier: 1.25 } },
    { threshold: 5, effect: { incomeMultiplier: 1.25, buildingDiscountPct: 0.2 } },
    { threshold: 8, effect: { incomeMultiplier: 1.5, buildingDiscountPct: 0.2 } },
  ],
  slotsPerNewLand: 1,
  maxSlotsPerLand: 2,
};

// =============================
// Domain Model
// =============================

type PlayerId = "A" | "B";

class Land {
  id: string;
  slotsMax: number;
  slotsUsed = 0;
  developments: string[] = [];
  constructor(id: string, slotsMax: number) { this.id = id; this.slotsMax = slotsMax; }
  get slotsFree() { return this.slotsMax - this.slotsUsed; }
}

class PlayerState {
  id: PlayerId;
  name: string;
  resources: Record<ResourceKey, number> = { [R.gold]: 0, [R.ap]: 0, [R.happiness]: 0, [R.castleHP]: 10 };
  roles: Record<RoleId, number> = { [Role.Council]: 0, [Role.Commander]: 0, [Role.Fortifier]: 0, [Role.Citizen]: 0 };
  lands: Land[] = [];
  buildings: Set<string> = new Set();
  constructor(id: PlayerId, name: string) { this.id = id; this.name = name; }
  get gold() { return this.resources[R.gold]; }
  set gold(v: number) { this.resources[R.gold] = v; }
  get ap() { return this.resources[R.ap]; }
  set ap(v: number) { this.resources[R.ap] = v; }
  get happiness() { return this.resources[R.happiness]; }
  set happiness(v: number) { this.resources[R.happiness] = v; }
}

class GameState {
  turn = 1;
  currentPlayerIndex = 0; // multi-player friendly
  currentPhase: PhaseId = Phase.Development;
  players: PlayerState[];
  constructor(aName = "Steph", bName = "Byte") {
    this.players = [new PlayerState("A", aName), new PlayerState("B", bName)];
  }
  get active(): PlayerState { return this.players[this.currentPlayerIndex]; }
  get opponent(): PlayerState { return this.players[(this.currentPlayerIndex + 1) % this.players.length]; }
}

// =============================
// Services
// =============================

class HappinessService {
  constructor(private rules: RuleSet) {}
  tier(h: number): HappinessTierEffect | undefined {
    let last: HappinessTierEffect | undefined;
    for (const t of this.rules.happinessTiers) if (h >= t.threshold) last = t.effect; else break;
    return last;
  }
}

// PopCap policy (placeholder — data-driven later)
class PopCapService {
  baseCastleHouses = 1; // can be moved to config
  getCap(p: PlayerState): number {
    const housesOnLand = p.lands.reduce((acc, l) => acc + l.developments.filter(d => d === "house").length, 0);
    return this.baseCastleHouses + housesOnLand;
  }
}

// =============================
// Passive Manager (cost/result modifiers)
// =============================

type CostModifier = (actionId: string, cost: CostBag, ctx: EngineContext) => CostBag;
type ResultModifier = (actionId: string, ctx: EngineContext) => void; // run after base effects

type CostBag = { [k in ResourceKey]?: number };

class PassiveManager {
  private costMods: CostModifier[] = [];
  private resultMods: ResultModifier[] = [];

  registerCostModifier(mod: CostModifier) { this.costMods.push(mod); }
  registerResultModifier(mod: ResultModifier) { this.resultMods.push(mod); }

  applyCostMods(actionId: string, base: CostBag, ctx: EngineContext): CostBag {
    return this.costMods.reduce((acc, m) => m(actionId, acc, ctx), { ...base });
    }

  runResultMods(actionId: string, ctx: EngineContext) {
    for (const m of this.resultMods) m(actionId, ctx);
  }
}

// =============================
// Configurable Actions & Buildings
// =============================

type EffectDef = { type: string; params?: Record<string, any> };

type ActionDef = {
  id: string;
  name: string;
  baseCosts?: CostBag; // { gold:2, ap:1 } — ap defaulted if omitted
  requirements?: ((ctx: EngineContext) => true | string)[]; // true or error message
  effects: EffectDef[]; // executed in order
};

type BuildingDef = {
  id: string;
  name: string;
  costs: CostBag;
  passives?: (pm: PassiveManager, ctx: EngineContext) => void; // register modifiers
};

// =============================
// Engine Context & Registries
// =============================

class Services {
  happiness: HappinessService;
  popcap: PopCapService;
  constructor(public rules: RuleSet) {
    this.happiness = new HappinessService(rules);
    this.popcap = new PopCapService();
  }
}

class Registry<T> {
  private map = new Map<string, T>();
  add(id: string, v: T) { this.map.set(id, v); }
  get(id: string): T { const v = this.map.get(id)!; if (!v) throw new Error(`Unknown id: ${id}`); return v; }
}

class EngineContext {
  constructor(
    public game: GameState,
    public services: Services,
    public actions: Registry<ActionDef>,
    public buildings: Registry<BuildingDef>,
    public passives: PassiveManager,
  ) {}
  get me() { return this.game.active; }
  get opp() { return this.game.opponent; }
}

// =============================
// Effects Runner
// =============================

function runEffects(effects: EffectDef[], ctx: EngineContext) {
  for (const e of effects) {
    switch (e.type) {
      case "add_land": {
        const count = e.params?.count ?? 1;
        for (let i = 0; i < count; i++) {
          const land = new Land(`${ctx.me.id}-L${ctx.me.lands.length + 1}`, ctx.services.rules.slotsPerNewLand);
          ctx.me.lands.push(land);
        }
        break;
      }
      case "add_resource": {
        const key = e.params!.key as ResourceKey; const amount = e.params!.amount as number;
        ctx.me.resources[key] = (ctx.me.resources[key] || 0) + amount;
        break;
      }
      case "add_building": {
        const id = e.params!.id as string;
        ctx.me.buildings.add(id);
        // when a building is added, register its passives immediately
        const b = ctx.buildings.get(id);
        b.passives?.(ctx.passives, ctx);
        break;
      }
      default:
        throw new Error(`Unknown effect type: ${e.type}`);
    }
  }
}

// =============================
// Action Executor
// =============================

function applyCostsWithPassives(actionId: string, base: CostBag, ctx: EngineContext): CostBag {
  const withDefaultAP = { ...base };
  if (withDefaultAP[R.ap] === undefined) withDefaultAP[R.ap] = ctx.services.rules.defaultActionAPCost;
  return ctx.passives.applyCostMods(actionId, withDefaultAP, ctx);
}

function canPay(costs: CostBag, p: PlayerState): true | string {
  for (const [key, amt] of Object.entries(costs)) {
    const need = amt ?? 0; const have = p.resources[key] ?? 0;
    if (have < need) return `Insufficient ${key}: need ${need}, have ${have}`;
  }
  return true;
}

function pay(costs: CostBag, p: PlayerState) {
  for (const [key, amt] of Object.entries(costs)) p.resources[key] = (p.resources[key] || 0) - (amt ?? 0);
}

function performAction(actionId: string, ctx: EngineContext) {
  const def = ctx.actions.get(actionId);
  // requirements
  for (const req of def.requirements || []) {
    const ok = req(ctx);
    if (ok !== true) throw new Error(String(ok));
  }
  // compute & pay costs (with passives)
  const costs = applyCostsWithPassives(def.id, def.baseCosts || {}, ctx);
  const ok = canPay(costs, ctx.me);
  if (ok !== true) throw new Error(ok);
  pay(costs, ctx.me);
  // run effects
  runEffects(def.effects, ctx);
  // passive result modifiers (e.g., Town Charter extra happiness on Expand)
  ctx.passives.runResultMods(def.id, ctx);
}

// =============================
// Phase Engine (minimal for Step B)
// =============================

function runDevelopment(ctx: EngineContext) {
  ctx.game.currentPhase = Phase.Development;
  // AP from councils
  ctx.me.ap += ctx.services.rules.apPerCouncil * (ctx.me.roles[Role.Council] || 0);
}

function runUpkeep(ctx: EngineContext) {
  ctx.game.currentPhase = Phase.Upkeep;
  // simple upkeep: 2 gold per council only (Step B proof)
  const due = 2 * (ctx.me.roles[Role.Council] || 0);
  if (ctx.me.gold < due) throw new Error(`Upkeep not payable (need ${due}, have ${ctx.me.gold})`);
  ctx.me.gold -= due;
  // end-of-upkeep triggers would run here via passives (not needed for Step B)
}

// =============================
// Config: Action Expand + Building Town Charter
// =============================

const ACTIONS = new Registry<ActionDef>();
const BUILDINGS = new Registry<BuildingDef>();

ACTIONS.add("expand", {
  id: "expand",
  name: "Expand",
  baseCosts: { [R.gold]: 2 },
  effects: [
    { type: "add_land", params: { count: 1 } },
    { type: "add_resource", params: { key: R.happiness, amount: 1 } },
  ],
});

BUILDINGS.add("town_charter", {
  id: "town_charter",
  name: "Town Charter",
  costs: { [R.gold]: 5 },
  passives: (pm: PassiveManager, ctx: EngineContext) => {
    // Cost modifier: Expand costs +2 gold
    pm.registerCostModifier((actionId, costs, _ctx) => {
      if (actionId === "expand") {
        const gold = (costs[R.gold] || 0) + 2;
        return { ...costs, [R.gold]: gold };
      }
      return costs;
    });
    // Result modifier: Expand grants +1 extra happiness
    pm.registerResultModifier((actionId, ctx2) => {
      if (actionId === "expand") {
        ctx2.me.happiness += 1; // stacks after base +1
      }
    });
  },
});

// A simple build action to acquire Town Charter in tests
ACTIONS.add("build_town_charter", {
  id: "build_town_charter",
  name: "Build — Town Charter",
  baseCosts: { [R.gold]: 5 },
  effects: [ { type: "add_building", params: { id: "town_charter" } } ],
});

// =============================
// Engine bootstrap & starting setup
// =============================

function createEngine() {
  const rules = DefaultRules;
  const services = new Services(rules);
  const passives = new PassiveManager();
  const game = new GameState("Steph", "Byte");
  const ctx = new EngineContext(game, services, ACTIONS, BUILDINGS, passives);
  // starting setup
  const A = ctx.game.players[0];
  const B = ctx.game.players[1];
  A.gold = 10; B.gold = 10;
  A.lands.push(new Land("A-L1", rules.slotsPerNewLand));
  A.lands.push(new Land("A-L2", rules.slotsPerNewLand));
  B.lands.push(new Land("B-L1", rules.slotsPerNewLand));
  B.lands.push(new Land("B-L2", rules.slotsPerNewLand));
  A.roles[Role.Council] = 1; B.roles[Role.Council] = 1;
  // start at Player A
  ctx.game.currentPlayerIndex = 0;
  return ctx;
}

// =============================
// =============================
// Tiny test runner
// =============================

type TestResult = { name: string; ok: boolean; details: string };

function runTests(): TestResult[] {
  const results: TestResult[] = [];

  // NOTE: For Step B, tests isolate action/building interactions.
  // We intentionally DO NOT run Upkeep in these tests to avoid conflating
  // upkeep payments with action costs. Upkeep will get its own tests later.

  // Test 1: Expand baseline (no Town Charter)
  {
    const ctx = createEngine();
    runDevelopment(ctx); // grants 1 AP
    const goldBefore = ctx.me.gold, apBefore = ctx.me.ap, landsBefore = ctx.me.lands.length, hapBefore = ctx.me.happiness;
    performAction("expand", ctx);
    const ok =
      ctx.me.gold === goldBefore - 2 &&
      ctx.me.ap === apBefore - 1 &&
      ctx.me.lands.length === landsBefore + 1 &&
      ctx.me.happiness === hapBefore + 1;
    results.push({
      name: "Expand baseline: costs 2g/1ap, +1 land, +1 happiness (no upkeep in this test)",
      ok,
      details: `gold ${goldBefore}->${ctx.me.gold}, ap ${apBefore}->${ctx.me.ap}, lands ${landsBefore}->${ctx.me.lands.length}, happy ${hapBefore}->${ctx.me.happiness}`,
    });
  }

  // Test 2: Build Town Charter, then Expand (cost +2g, +1 extra happiness)
  {
    const ctx = createEngine();
    runDevelopment(ctx); // 1 AP
    performAction("build_town_charter", ctx); // pay 5g, ap-1; registers passives
    // give AP for next action within same turn for simplicity in test
    ctx.me.ap += 1;
    const goldBefore = ctx.me.gold, apBefore = ctx.me.ap, hapBefore = ctx.me.happiness;
    performAction("expand", ctx);
    const expectedGoldCost = 2 + 2; // base + surcharge from Town Charter
    const ok =
      ctx.me.gold === goldBefore - expectedGoldCost &&
      ctx.me.ap === apBefore - 1 &&
      ctx.me.happiness === hapBefore + 2;
    results.push({
      name: "Expand with Town Charter: costs +2 gold, +1 extra happiness (no upkeep in this test)",
      ok,
      details: `gold ${goldBefore}->${ctx.me.gold} (expected -${expectedGoldCost}), ap ${apBefore}->${ctx.me.ap}, happy ${hapBefore}->${ctx.me.happiness}`,
    });
  }

  // Test 3: Multiple Expands stack modifiers consistently
  {
    const ctx = createEngine();
    runDevelopment(ctx);
    performAction("build_town_charter", ctx);
    ctx.me.ap += 2; // allow two expands
    ctx.me.gold += 10; // top-up to isolate Expand/Charter behavior (afford two expands)
    const goldBefore = ctx.me.gold, hapBefore = ctx.me.happiness, landsBefore = ctx.me.lands.length;
    performAction("expand", ctx);
    performAction("expand", ctx);
    const totalCost = (2 + 2) * 2; // two expands with surcharge
    const ok =
      ctx.me.gold === goldBefore - totalCost &&
      ctx.me.happiness === hapBefore + 4 &&
      ctx.me.lands.length === landsBefore + 2;
    results.push({
      name: "Two Expands with Town Charter: costs and happiness scale properly (no upkeep in this test)",
      ok,
      details: `gold ${goldBefore}->${ctx.me.gold} (expected -${totalCost}), happy ${hapBefore}->${ctx.me.happiness}, lands ${landsBefore}->${ctx.me.lands.length}`,
    });
  }

  return results;
}

// =============================
// React Harness
// =============================

export default function App() {
  const [results, setResults] = useState<TestResult[]>([]);
  useEffect(() => {
    const res = runTests();
    // also log to console for full trace
    console.clear();
    for (const r of res) console.log(`${r.ok ? "✅" : "❌"} ${r.name}
   → ${r.details}`);
    setResults(res);
  }, []);

  const passed = results.every(r => r.ok);
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">KB Engine — Step A+B Runner</h1>
      <p className="opacity-70">Proof slice with <b>Expand</b> action and <b>Town Charter</b> building, including PassiveManager hooks.</p>
      <div className="rounded-xl border p-4">
        <div className="font-semibold mb-2">Test Results</div>
        <ul className="list-disc pl-6 space-y-1">
          {results.map((r, i) => (
            <li key={i} className={r.ok ? "text-green-600" : "text-red-600"}>
              {r.ok ? "✅" : "❌"} {r.name}
              <div className="text-sm opacity-80">{r.details}</div>
            </li>
          ))}
        </ul>
        <div className={`mt-3 font-semibold ${passed ? "text-green-700" : "text-red-700"}`}>
          {passed ? "All tests passed" : "Some tests failed — see console for details"}
        </div>
      </div>
      <div className="text-xs opacity-60">
        Note: Step B tests intentionally skip Upkeep to isolate Expand/Charter behavior. We'll add dedicated Upkeep tests next.
      </div>
    </div>
  );
}
