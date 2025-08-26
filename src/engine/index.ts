import { Resource, Phase, Role, GameState, PlayerState, Land } from "./state";
import { Services, PassiveManager, DefaultRules, CostBag } from "./services";
import { EffectDef, createActionRegistry } from "./actions";
import { BUILDINGS } from "./buildings";
import { EngineContext } from "./context";
import { EFFECTS, registerCoreEffects } from "./effects";

function runEffects(effects: EffectDef[], ctx: EngineContext) {
  for (const e of effects) {
    const handler = EFFECTS.get(e.type);
    handler(e, ctx);
  }
}

function applyCostsWithPassives(actionId: string, base: CostBag, ctx: EngineContext): CostBag {
  const withDefaultAP = { ...base };
  if (withDefaultAP[Resource.ap] === undefined) withDefaultAP[Resource.ap] = ctx.services.rules.defaultActionAPCost;
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
  for (const [key, amt] of Object.entries(costs))
    p.resources[key] = (p.resources[key] || 0) - (amt ?? 0);
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
  ctx.activePlayer.ap += ctx.services.rules.apPerCouncil * (ctx.activePlayer.roles[Role.Council] || 0);
}

export function runUpkeep(ctx: EngineContext) {
  ctx.game.currentPhase = Phase.Upkeep;
  const due = 2 * (ctx.activePlayer.roles[Role.Council] || 0);
  if (ctx.activePlayer.gold < due) throw new Error(`Upkeep not payable (need ${due}, have ${ctx.activePlayer.gold})`);
  ctx.activePlayer.gold -= due;
}

export function createEngine(overrides?: {
  actions?: import("./registry").Registry<import("./actions").ActionDef>;
  buildings?: import("./registry").Registry<import("./buildings").BuildingDef>;
}) {
  registerCoreEffects();
  
  const rules = DefaultRules;
  const services = new Services(rules);
  const passives = new PassiveManager();
  const game = new GameState("Steph", "Byte");
  const actions = overrides?.actions || createActionRegistry();
  const buildings = overrides?.buildings || BUILDINGS;
  const ctx = new EngineContext(game, services, actions, buildings, passives);
  const playerA = ctx.game.players[0];
  const playerB = ctx.game.players[1];

  playerA.gold = 10; playerB.gold = 10;
  playerA.lands.push(new Land("A-L1", rules.slotsPerNewLand));
  playerA.lands.push(new Land("A-L2", rules.slotsPerNewLand));
  playerB.lands.push(new Land("B-L1", rules.slotsPerNewLand));
  playerB.lands.push(new Land("B-L2", rules.slotsPerNewLand));
  playerA.roles[Role.Council] = 1; playerB.roles[Role.Council] = 1;
  ctx.game.currentPlayerIndex = 0;
  
  return ctx;
}

export {
  Resource,
  Phase,
  Role,
  BUILDINGS,
  EFFECTS,
  EngineContext,
  Services,
  PassiveManager,
  DefaultRules,
};

export { createActionRegistry } from "./actions";

export { registerCoreEffects, EffectRegistry } from "./effects";
export type { EffectHandler } from "./effects";
