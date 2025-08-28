import {
  Resource,
  Phase,
  PopulationRole,
  Stat,
  GameState,
  Land,
} from './state';
import type { ResourceKey, PlayerState } from './state';
import { Services, PassiveManager, DefaultRules } from './services';
import type { CostBag, RuleSet } from './services';
import { createActionRegistry } from './content/actions';
import { BUILDINGS } from './content/buildings';
import { DEVELOPMENTS } from './content/developments';
import { POPULATIONS } from './content/populations';
import type { PopulationDef } from './content/populations';
import type { TriggerKey } from './content/defs';
import type { ActionDef } from './content/actions';
import type { BuildingDef } from './content/buildings';
import type { DevelopmentDef } from './content/developments';
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
    const populationDefinition = ctx.populations.get(role);
    const effects = populationDefinition[trigger];
    if (effects) runEffects(effects, ctx, Number(count));
  }

  for (const land of player.lands) {
    for (const id of land.developments) {
      const developmentDefinition = ctx.developments.get(id);
      const effects = developmentDefinition[trigger];
      if (!effects) continue;
      runEffects(applyParamsToEffects(effects, { landId: land.id, id }), ctx);
    }
  }

  for (const id of player.buildings) {
    const buildingDefinition = ctx.buildings.get(id);
    const effects = buildingDefinition[trigger];
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
  const actionDefinition = ctx.actions.get(actionId);
  return applyCostsWithPassives(
    actionDefinition.id,
    actionDefinition.baseCosts || {},
    ctx,
  );
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
  const actionDefinition = ctx.actions.get(actionId);
  for (const requirement of actionDefinition.requirements || []) {
    const ok = requirement(ctx);
    if (ok !== true) throw new Error(String(ok));
  }
  const costs = applyCostsWithPassives(
    actionDefinition.id,
    actionDefinition.baseCosts || {},
    ctx,
  );
  const ok = canPay(costs, ctx.activePlayer);
  if (ok !== true) throw new Error(ok);
  pay(costs, ctx.activePlayer);

  const resolved = applyParamsToEffects(actionDefinition.effects, params || {});
  runEffects(resolved, ctx);
  ctx.passives.runResultMods(actionDefinition.id, ctx);
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
  const rounding = ctx.services.rules.absorptionRounding;
  if (rounding === 'down') final = Math.floor(final);
  else if (rounding === 'up') final = Math.ceil(final);
  else final = Math.round(final);
  runTrigger('onAttackResolved', ctx, defender);
  return final;
}

export function createEngine(overrides?: {
  actions?: Registry<ActionDef>;
  buildings?: Registry<BuildingDef>;
  developments?: Registry<DevelopmentDef>;
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
    const config = validateGameConfig(overrides.config);
    if (config.actions) {
      const registry = new Registry<ActionDef>(actionSchema);
      for (const action of config.actions) registry.add(action.id, action);
      actions = registry;
    }
    if (config.buildings) {
      const registry = new Registry<BuildingDef>(buildingSchema);
      for (const building of config.buildings)
        registry.add(building.id, building);
      buildings = registry;
    }
    if (config.developments) {
      const registry = new Registry<DevelopmentDef>(developmentSchema);
      for (const development of config.developments)
        registry.add(development.id, development);
      developments = registry;
    }
    if (config.populations) {
      const registry = new Registry<PopulationDef>(populationSchema);
      for (const population of config.populations)
        registry.add(population.id, population);
      populations = registry;
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
  const playerA = ctx.game.players[0]!;
  const playerB = ctx.game.players[1]!;

  playerA.gold = 10;
  playerB.gold = 10;
  playerA.lands.push(new Land('A-L1', rules.slotsPerNewLand));
  playerA.lands.push(new Land('A-L2', rules.slotsPerNewLand));
  playerB.lands.push(new Land('B-L1', rules.slotsPerNewLand));
  playerB.lands.push(new Land('B-L2', rules.slotsPerNewLand));
  playerA.lands[0]!.developments.push('farm');
  playerA.lands[0]!.slotsUsed = 1;
  playerB.lands[0]!.developments.push('farm');
  playerB.lands[0]!.slotsUsed = 1;
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

export type { RuleSet, ResourceKey };

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
