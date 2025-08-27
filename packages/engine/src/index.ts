import {
  Resource,
  Phase,
  PopulationRole,
  Stat,
  GameState,
  PlayerState,
  Land,
  ResourceKey,
} from "./state";
import { Services, PassiveManager, DefaultRules, CostBag, RuleSet } from "./services";
import { createActionRegistry } from "./actions";
import { BUILDINGS } from "./buildings";
import { DEVELOPMENTS } from "./developments";
import { POPULATIONS, PopulationDef } from "./populations";
import { EngineContext } from "./context";
import { runEffects, EFFECTS, registerCoreEffects } from "./effects";
import { EVALUATORS, registerCoreEvaluators } from "./evaluators";
import { Registry } from "./registry";
import {
  validateGameConfig,
  type GameConfig,
  actionSchema,
  buildingSchema,
  developmentSchema,
  populationSchema,
} from "./config/schema";

function runPopulationTrigger(trigger: "onDevelopmentPhase" | "onUpkeepPhase", ctx: EngineContext) {
  for (const [role, count] of Object.entries(ctx.activePlayer.population)) {
    const def = ctx.populations.get(role);
    const effects = def[trigger];
    if (!effects) continue;
    runEffects(effects, ctx, count as number);
  }
}

function applyCostsWithPassives(actionId: string, base: CostBag, ctx: EngineContext): CostBag {
  const withDefaultAP = { ...base };
  if (withDefaultAP[Resource.ap] === undefined) withDefaultAP[Resource.ap] = ctx.services.rules.defaultActionAPCost;
  return ctx.passives.applyCostMods(actionId, withDefaultAP, ctx);
}

function canPay(costs: CostBag, player: PlayerState): true | string {
  for (const key of Object.keys(costs) as ResourceKey[]) {
    const need = costs[key] ?? 0;
    const available = player.resources[key] ?? 0;
    if (available < need) {
      return `Insufficient ${key}: need ${need}, have ${available}`;
    }
  }
  return true;
}

function pay(costs: CostBag, player: PlayerState) {
  for (const key of Object.keys(costs) as ResourceKey[]) {
    const amount = costs[key] ?? 0;
    player.resources[key] = (player.resources[key] || 0) - amount;
  }
}

export function performAction(actionId: string, ctx: EngineContext) {
  const def = ctx.actions.get(actionId);
  for (const req of def.requirements || []) {
    const ok = req(ctx);
    if (ok !== true) throw new Error(String(ok));
  }
  const costs = applyCostsWithPassives(def.id, def.baseCosts || {}, ctx);
  const ok = canPay(costs, ctx.activePlayer);
  if (ok !== true) throw new Error(ok);
  pay(costs, ctx.activePlayer);
  runEffects(def.effects, ctx);
  ctx.passives.runResultMods(def.id, ctx);
}

export function runDevelopment(ctx: EngineContext) {
  ctx.game.currentPhase = Phase.Development;
  runPopulationTrigger("onDevelopmentPhase", ctx);
  for (const land of ctx.activePlayer.lands) {
    for (const id of land.developments) {
      const def = ctx.developments.get(id);
      if (def?.onDevelopmentPhase) runEffects(def.onDevelopmentPhase, ctx);
    }
  }
}

export function runUpkeep(ctx: EngineContext) {
  ctx.game.currentPhase = Phase.Upkeep;
  runPopulationTrigger("onUpkeepPhase", ctx);
}

export function createEngine(overrides?: {
  actions?: Registry<import("./actions").ActionDef>;
  buildings?: Registry<import("./buildings").BuildingDef>;
  developments?: Registry<import("./developments").DevelopmentDef>;
  populations?: Registry<PopulationDef>;
  rules?: RuleSet;
  config?: GameConfig;
}) {
  registerCoreEffects();
  registerCoreEvaluators();

  const rules = overrides?.rules || DefaultRules;
  const services = new Services(rules);
  const passives = new PassiveManager();
  const game = new GameState("Steph", "Byte");

  let actions = overrides?.actions;
  let buildings = overrides?.buildings;
  let developments = overrides?.developments;
  let populations = overrides?.populations;

  if (overrides?.config) {
    const cfg = validateGameConfig(overrides.config);
    if (cfg.actions) {
      const reg = new Registry<import("./actions").ActionDef>(actionSchema);
      for (const a of cfg.actions) reg.add(a.id, a);
      actions = reg;
    }
    if (cfg.buildings) {
      const reg = new Registry<import("./buildings").BuildingDef>(buildingSchema);
      for (const b of cfg.buildings) reg.add(b.id, b);
      buildings = reg;
    }
    if (cfg.developments) {
      const reg = new Registry<import("./developments").DevelopmentDef>(developmentSchema);
      for (const d of cfg.developments) reg.add(d.id, d);
      developments = reg;
    }
    if (cfg.populations) {
      const reg = new Registry<PopulationDef>(populationSchema);
      for (const p of cfg.populations) reg.add(p.id, p);
      populations = reg;
    }
  }

  actions = actions || createActionRegistry();
  buildings = buildings || BUILDINGS;
  developments = developments || DEVELOPMENTS;
  populations = populations || POPULATIONS;

  const ctx = new EngineContext(game, services, actions, buildings, developments, populations, passives);
  const playerA = ctx.game.players[0];
  const playerB = ctx.game.players[1];

  playerA.gold = 10; playerB.gold = 10;
  playerA.lands.push(new Land("A-L1", rules.slotsPerNewLand));
  playerA.lands.push(new Land("A-L2", rules.slotsPerNewLand));
  playerB.lands.push(new Land("B-L1", rules.slotsPerNewLand));
  playerB.lands.push(new Land("B-L2", rules.slotsPerNewLand));
  playerA.lands[0].developments.push("farm");
  playerA.lands[0].slotsUsed = 1;
  playerB.lands[0].developments.push("farm");
  playerB.lands[0].slotsUsed = 1;
  playerA.population[PopulationRole.Council] = 1; playerB.population[PopulationRole.Council] = 1;
  ctx.game.currentPlayerIndex = 0;

  return ctx;
}

export {
  Resource,
  Phase,
  PopulationRole,
  Stat,
  BUILDINGS,
  DEVELOPMENTS,
  EFFECTS,
  EVALUATORS,
  POPULATIONS,
  EngineContext,
  Services,
  PassiveManager,
  DefaultRules,
};

export type { RuleSet };

export { createActionRegistry } from "./actions";

export { registerCoreEffects, EffectRegistry } from "./effects";
export type { EffectHandler, EffectDef } from "./effects";
export { registerCoreEvaluators, EvaluatorRegistry } from "./evaluators";
export type { EvaluatorHandler, EvaluatorDef } from "./evaluators";
export { createDevelopmentRegistry } from "./developments";
export { createPopulationRegistry } from "./populations";
export { validateGameConfig } from "./config/schema";
export type { GameConfig } from "./config/schema";
