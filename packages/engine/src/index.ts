import {
  Resource,
  Phase,
  PopulationRole,
  Stat,
  GameState,
  PlayerState,
  Land,
  ResourceKey,
} from './state';
import {
  Services,
  PassiveManager,
  DefaultRules,
  CostBag,
  RuleSet,
} from './services';
import { createActionRegistry } from './content/actions';
import { BUILDINGS } from './content/buildings';
import { DEVELOPMENTS } from './content/developments';
import { POPULATIONS, PopulationDef } from './content/populations';
import type { TriggerKey } from './content/defs';
import { EngineContext } from './context';
import { runEffects, EFFECTS, registerCoreEffects } from './effects';
import { EVALUATORS, registerCoreEvaluators } from './evaluators';
import { Registry } from './registry';
import { applyParamsToEffects } from './utils';
import {
  validateGameConfig,
  type GameConfig,
  actionSchema,
  buildingSchema,
  developmentSchema,
  populationSchema,
} from './config/schema';

function runTrigger(
  trigger: TriggerKey,
  ctx: EngineContext,
  player: PlayerState = ctx.activePlayer,
) {
  const original = ctx.game.currentPlayerIndex;
  const index = ctx.game.players.indexOf(player);
  ctx.game.currentPlayerIndex = index;

  for (const [role, count] of Object.entries(player.population)) {
    const def = ctx.populations.get(role);
    const effects = def[trigger];
    if (effects) runEffects(effects, ctx, count as number);
  }

  for (const land of player.lands) {
    for (const id of land.developments) {
      const def = ctx.developments.get(id);
      const effects = def[trigger];
      if (!effects) continue;
      runEffects(applyParamsToEffects(effects, { landId: land.id, id }), ctx);
    }
  }

  for (const id of player.buildings) {
    const def = ctx.buildings.get(id);
    const effects = def[trigger];
    if (effects) runEffects(effects, ctx);
  }

  ctx.game.currentPlayerIndex = original;
}

function applyCostsWithPassives(
  actionId: string,
  base: CostBag,
  ctx: EngineContext,
): CostBag {
  const withDefaultAP = { ...base };
  if (withDefaultAP[Resource.ap] === undefined)
    withDefaultAP[Resource.ap] = ctx.services.rules.defaultActionAPCost;
  return ctx.passives.applyCostMods(actionId, withDefaultAP, ctx);
}

export function getActionCosts(actionId: string, ctx: EngineContext): CostBag {
  const def = ctx.actions.get(actionId);
  return applyCostsWithPassives(def.id, def.baseCosts || {}, ctx);
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

type ActionParamMap = {
  develop: { id: string; landId: string };
  [key: string]: Record<string, unknown>;
};

export type ActionParams<T extends string> = T extends keyof ActionParamMap
  ? ActionParamMap[T]
  : Record<string, unknown>;

export function performAction<T extends string>(
  actionId: T,
  ctx: EngineContext,
  params?: ActionParams<T>,
) {
  const def = ctx.actions.get(actionId);
  for (const req of def.requirements || []) {
    const ok = req(ctx);
    if (ok !== true) throw new Error(String(ok));
  }
  const costs = applyCostsWithPassives(def.id, def.baseCosts || {}, ctx);
  const ok = canPay(costs, ctx.activePlayer);
  if (ok !== true) throw new Error(ok);
  pay(costs, ctx.activePlayer);

  const resolved = applyParamsToEffects(def.effects, params || {});
  runEffects(resolved, ctx);
  ctx.passives.runResultMods(def.id, ctx);
}

export function runDevelopment(ctx: EngineContext) {
  ctx.game.currentPhase = Phase.Development;
  runTrigger('onDevelopmentPhase', ctx);
}

export function runUpkeep(ctx: EngineContext) {
  ctx.game.currentPhase = Phase.Upkeep;
  runTrigger('onUpkeepPhase', ctx);
}

export function resolveAttack(
  defender: PlayerState,
  damage: number,
  ctx: EngineContext,
) {
  const absorb = Math.min(
    defender.absorption || 0,
    ctx.services.rules.absorptionCapPct,
  );
  let final = damage * (1 - absorb);
  const r = ctx.services.rules.absorptionRounding;
  if (r === 'down') final = Math.floor(final);
  else if (r === 'up') final = Math.ceil(final);
  else final = Math.round(final);
  runTrigger('onAttackResolved', ctx, defender);
  return final;
}

export function createEngine(overrides?: {
  actions?: Registry<import('./content/actions').ActionDef>;
  buildings?: Registry<import('./content/buildings').BuildingDef>;
  developments?: Registry<import('./content/developments').DevelopmentDef>;
  populations?: Registry<PopulationDef>;
  rules?: RuleSet;
  config?: GameConfig;
}) {
  registerCoreEffects();
  registerCoreEvaluators();

  const rules = overrides?.rules || DefaultRules;
  const services = new Services(rules);
  const passives = new PassiveManager();
  const game = new GameState('Steph', 'Byte');

  let actions = overrides?.actions;
  let buildings = overrides?.buildings;
  let developments = overrides?.developments;
  let populations = overrides?.populations;

  if (overrides?.config) {
    const cfg = validateGameConfig(overrides.config);
    if (cfg.actions) {
      const reg = new Registry<import('./content/actions').ActionDef>(
        actionSchema,
      );
      for (const a of cfg.actions) reg.add(a.id, a);
      actions = reg;
    }
    if (cfg.buildings) {
      const reg = new Registry<import('./content/buildings').BuildingDef>(
        buildingSchema,
      );
      for (const b of cfg.buildings) reg.add(b.id, b);
      buildings = reg;
    }
    if (cfg.developments) {
      const reg = new Registry<import('./content/developments').DevelopmentDef>(
        developmentSchema,
      );
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

  const ctx = new EngineContext(
    game,
    services,
    actions,
    buildings,
    developments,
    populations,
    passives,
  );
  const playerA = ctx.game.players[0];
  const playerB = ctx.game.players[1];

  playerA.gold = 10;
  playerB.gold = 10;
  playerA.lands.push(new Land('A-L1', rules.slotsPerNewLand));
  playerA.lands.push(new Land('A-L2', rules.slotsPerNewLand));
  playerB.lands.push(new Land('B-L1', rules.slotsPerNewLand));
  playerB.lands.push(new Land('B-L2', rules.slotsPerNewLand));
  playerA.lands[0].developments.push('farm');
  playerA.lands[0].slotsUsed = 1;
  playerB.lands[0].developments.push('farm');
  playerB.lands[0].slotsUsed = 1;
  playerA.population[PopulationRole.Council] = 1;
  playerB.population[PopulationRole.Council] = 1;
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

export { createActionRegistry } from './content/actions';
export { createBuildingRegistry } from './content/buildings';
export { createDevelopmentRegistry } from './content/developments';
export { createPopulationRegistry } from './content/populations';

export { registerCoreEffects, EffectRegistry } from './effects';
export type { EffectHandler, EffectDef } from './effects';
export { registerCoreEvaluators, EvaluatorRegistry } from './evaluators';
export type { EvaluatorHandler, EvaluatorDef } from './evaluators';
export { validateGameConfig } from './config/schema';
export type { GameConfig } from './config/schema';
