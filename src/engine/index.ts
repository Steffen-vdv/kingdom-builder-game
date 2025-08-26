import { R, Phase, Role, GameState, PlayerState, Land } from "./state";
import { Services, PassiveManager, DefaultRules, CostBag } from "./services";
import { ACTIONS, EffectDef } from "./actions";
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
  const ok = canPay(costs, ctx.me);
  if (ok !== true) throw new Error(ok);
  pay(costs, ctx.me);
  runEffects(def.effects, ctx);
  ctx.passives.runResultMods(def.id, ctx);
}

export function runDevelopment(ctx: EngineContext) {
  ctx.game.currentPhase = Phase.Development;
  ctx.me.ap += ctx.services.rules.apPerCouncil * (ctx.me.roles[Role.Council] || 0);
}

export function runUpkeep(ctx: EngineContext) {
  ctx.game.currentPhase = Phase.Upkeep;
  const due = 2 * (ctx.me.roles[Role.Council] || 0);
  if (ctx.me.gold < due) throw new Error(`Upkeep not payable (need ${due}, have ${ctx.me.gold})`);
  ctx.me.gold -= due;
}

export function createEngine() {
  registerCoreEffects();
  const rules = DefaultRules;
  const services = new Services(rules);
  const passives = new PassiveManager();
  const game = new GameState("Steph", "Byte");
  const ctx = new EngineContext(game, services, ACTIONS, BUILDINGS, passives);
  const A = ctx.game.players[0];
  const B = ctx.game.players[1];
  A.gold = 10; B.gold = 10;
  A.lands.push(new Land("A-L1", rules.slotsPerNewLand));
  A.lands.push(new Land("A-L2", rules.slotsPerNewLand));
  B.lands.push(new Land("B-L1", rules.slotsPerNewLand));
  B.lands.push(new Land("B-L2", rules.slotsPerNewLand));
  A.roles[Role.Council] = 1; B.roles[Role.Council] = 1;
  ctx.game.currentPlayerIndex = 0;
  return ctx;
}

export {
  R,
  Phase,
  Role,
  ACTIONS,
  BUILDINGS,
  EFFECTS,
  EngineContext,
  Services,
  PassiveManager,
  DefaultRules,
};

export { registerCoreEffects, EffectRegistry } from "./effects";
export type { EffectHandler } from "./effects";
