import {
  Resource,
  Phase,
  PopulationRole,
  Stat,
  GameState,
  Land,
} from './state';
import type {
  ResourceKey,
  PlayerState,
  StatKey,
  PopulationRoleId,
} from './state';
import { Services, PassiveManager, DefaultRules } from './services';
import type { CostBag, RuleSet } from './services';
import { EngineContext } from './context';
import { runEffects, EFFECTS, registerCoreEffects } from './effects';
import type { EffectDef } from './effects';
import { EVALUATORS, registerCoreEvaluators } from './evaluators';
import { runRequirement, registerCoreRequirements } from './requirements';
import { Registry } from './registry';
import { applyParamsToEffects } from './utils';
import {
  validateGameConfig,
  type GameConfig,
  actionSchema,
  buildingSchema,
  developmentSchema,
  populationSchema,
  type PlayerStartConfig,
  type ActionConfig as ActionDef,
  type BuildingConfig as BuildingDef,
  type DevelopmentConfig as DevelopmentDef,
  type PopulationConfig as PopulationDef,
  type StartConfig,
} from './config/schema';
import type { PhaseDef } from './phases';
export { snapshotPlayer } from './log';
export type { PlayerSnapshot, ActionTrace } from './log';

type TriggerKey = string;

function getEffects(def: unknown, trigger: string): EffectDef[] | undefined {
  const val = (def as Record<string, unknown>)[trigger];
  return Array.isArray(val) ? (val as EffectDef[]) : undefined;
}

export function collectTriggerEffects(
  trigger: TriggerKey,
  ctx: EngineContext,
  player: PlayerState = ctx.activePlayer,
): EffectDef[] {
  const effects: EffectDef[] = [];
  for (const [role, count] of Object.entries(player.population)) {
    const populationDefinition = ctx.populations.get(role);
    const list = getEffects(populationDefinition, trigger);
    if (!list) continue;
    for (let i = 0; i < Number(count); i++)
      effects.push(...list.map((e) => ({ ...e })));
  }
  for (const land of player.lands) {
    for (const id of land.developments) {
      const developmentDefinition = ctx.developments.get(id);
      const list = getEffects(developmentDefinition, trigger);
      if (!list) continue;
      effects.push(
        ...applyParamsToEffects(list, { landId: land.id, id }).map((e) => ({
          ...e,
        })),
      );
    }
  }
  for (const id of player.buildings) {
    const buildingDefinition = ctx.buildings.get(id);
    const list = getEffects(buildingDefinition, trigger);
    if (list) effects.push(...list.map((e) => ({ ...e })));
  }
  for (const passive of ctx.passives.values(player.id)) {
    const list = getEffects(passive, trigger);
    if (list) effects.push(...list.map((e) => ({ ...e })));
  }
  return effects;
}

function applyCostsWithPassives(
  actionId: string,
  base: CostBag,
  ctx: EngineContext,
): CostBag {
  const withDefaultAP = { ...base };
  const definition = ctx.actions.get(actionId);
  if (withDefaultAP[Resource.ap] === undefined)
    withDefaultAP[Resource.ap] = definition.system
      ? 0
      : ctx.services.rules.defaultActionAPCost;
  return ctx.passives.applyCostMods(actionId, withDefaultAP, ctx);
}

export function getActionCosts<T extends string>(
  actionId: T,
  ctx: EngineContext,
  params?: ActionParams<T>,
): CostBag {
  const actionDefinition = ctx.actions.get(actionId);
  const base = { ...(actionDefinition.baseCosts || {}) };
  const resolved = applyParamsToEffects(actionDefinition.effects, params || {});
  for (const effect of resolved) {
    if (effect.type === 'building' && effect.method === 'add') {
      const id = effect.params?.['id'] as string;
      const building = ctx.buildings.get(id);
      for (const key of Object.keys(building.costs) as ResourceKey[]) {
        base[key] = (base[key] || 0) + (building.costs[key] || 0);
      }
    }
  }
  return applyCostsWithPassives(actionDefinition.id, base, ctx);
}

export function getActionRequirements<T extends string>(
  actionId: T,
  ctx: EngineContext,
  _params?: ActionParams<T>,
): string[] {
  const actionDefinition = ctx.actions.get(actionId);
  const failures: string[] = [];
  for (const requirement of actionDefinition.requirements || []) {
    const ok = runRequirement(requirement, ctx);
    if (ok !== true) failures.push(String(ok));
  }
  return failures;
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
  build: { id: string };
  raise_pop: { role: PopulationRoleId };
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
  ctx.actionTraces = [];
  const actionDefinition = ctx.actions.get(actionId);
  if (actionDefinition.system && !ctx.activePlayer.actions.has(actionId))
    throw new Error(`Action ${actionId} is locked`);
  for (const requirement of actionDefinition.requirements || []) {
    const ok = runRequirement(requirement, ctx);
    if (ok !== true) throw new Error(String(ok));
  }
  const base = { ...(actionDefinition.baseCosts || {}) };
  const resolved = applyParamsToEffects(actionDefinition.effects, params || {});
  for (const effect of resolved) {
    if (effect.type === 'building' && effect.method === 'add') {
      const id = effect.params?.['id'] as string;
      const building = ctx.buildings.get(id);
      for (const key of Object.keys(building.costs) as ResourceKey[]) {
        base[key] = (base[key] || 0) + (building.costs[key] || 0);
      }
    }
  }
  const costs = applyCostsWithPassives(actionDefinition.id, base, ctx);
  const ok = canPay(costs, ctx.activePlayer);
  if (ok !== true) throw new Error(ok);
  pay(costs, ctx.activePlayer);

  runEffects(resolved, ctx);
  ctx.passives.runResultMods(actionDefinition.id, ctx);
  const traces = ctx.actionTraces;
  ctx.actionTraces = [];
  return traces;
}

export interface AdvanceResult {
  phase: string;
  step: string;
  effects: EffectDef[];
  player: PlayerState;
}

export function advance(ctx: EngineContext): AdvanceResult {
  const phase = ctx.phases[ctx.game.phaseIndex]!;
  const step = phase.steps[ctx.game.stepIndex];
  const player = ctx.activePlayer;
  const effects: EffectDef[] = [];
  if (step?.triggers) {
    for (const trig of step.triggers) {
      const collected = collectTriggerEffects(trig, ctx, player);
      if (collected.length) {
        runEffects(collected, ctx);
        effects.push(...collected);
      }
    }
  }
  if (step?.effects) {
    runEffects(step.effects, ctx);
    effects.push(...step.effects);
  }

  if (step) ctx.passives.runResultMods(step.id, ctx);

  const compResource: Record<string, ResourceKey> = {
    'gain-ap': Resource.ap,
    'gain-income': Resource.gold,
  };
  const resKey = step ? compResource[step.id] : undefined;
  if (resKey) {
    const diff = ctx.compensations[player.id]?.resources?.[resKey];
    if (diff) {
      const extra: EffectDef = {
        type: 'resource',
        method: 'add',
        params: { key: resKey, amount: diff },
      };
      runEffects([extra], ctx);
      effects.push(extra);
    }
  }

  ctx.game.stepIndex += 1;
  if (ctx.game.stepIndex >= phase.steps.length) {
    ctx.game.stepIndex = 0;
    ctx.game.phaseIndex += 1;
    if (ctx.game.phaseIndex >= ctx.phases.length) {
      ctx.game.phaseIndex = 0;
      if (ctx.game.currentPlayerIndex === ctx.game.players.length - 1) {
        ctx.game.currentPlayerIndex = 0;
        ctx.game.turn += 1;
      } else {
        ctx.game.currentPlayerIndex += 1;
      }
    }
  }

  const nextPhase = ctx.phases[ctx.game.phaseIndex]!;
  const nextStep = nextPhase.steps[ctx.game.stepIndex];
  ctx.game.currentPhase = nextPhase.id;
  ctx.game.currentStep = nextStep ? nextStep.id : '';

  return { phase: phase.id, step: step?.id || '', effects, player };
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
  const original = ctx.game.currentPlayerIndex;
  const index = ctx.game.players.indexOf(defender);
  ctx.game.currentPlayerIndex = index;
  const effects = collectTriggerEffects('onAttackResolved', ctx, defender);
  if (effects.length) runEffects(effects, ctx);
  ctx.game.currentPlayerIndex = original;
  return final;
}

function applyPlayerStart(
  player: PlayerState,
  config: PlayerStartConfig,
  rules: RuleSet,
) {
  for (const [key, value] of Object.entries(config.resources || {}))
    player.resources[key as ResourceKey] = value ?? 0;
  for (const [key, value] of Object.entries(config.stats || {})) {
    const val = value ?? 0;
    const statKey = key as StatKey;
    player.stats[statKey] = val;
    if (val !== 0) player.statsHistory[statKey] = true;
  }
  for (const [key, value] of Object.entries(config.population || {}))
    player.population[key as PopulationRoleId] = value ?? 0;
  if (config.lands)
    config.lands.forEach((landCfg, idx) => {
      const land = new Land(
        `${player.id}-L${idx + 1}`,
        landCfg.slotsMax ?? rules.slotsPerNewLand,
        landCfg.tilled ?? false,
      );
      if (landCfg.developments) land.developments.push(...landCfg.developments);
      land.slotsUsed = landCfg.slotsUsed ?? land.developments.length;
      player.lands.push(land);
    });
}

function diffPlayerStart(
  base: PlayerStartConfig,
  override: PlayerStartConfig | undefined,
): PlayerStartConfig {
  const diff: PlayerStartConfig = {};
  if (!override) return diff;
  for (const [key, value] of Object.entries(override.resources || {})) {
    const baseVal = base.resources?.[key as ResourceKey] ?? 0;
    const delta = (value ?? 0) - baseVal;
    if (delta !== 0) {
      diff.resources = diff.resources || {};
      diff.resources[key as ResourceKey] = delta;
    }
  }
  for (const [key, value] of Object.entries(override.stats || {})) {
    const baseVal = base.stats?.[key as StatKey] ?? 0;
    const delta = (value ?? 0) - baseVal;
    if (delta !== 0) {
      diff.stats = diff.stats || {};
      diff.stats[key as StatKey] = delta;
    }
  }
  return diff;
}

export function createEngine({
  actions,
  buildings,
  developments,
  populations,
  phases,
  start,
  rules,
  config,
}: {
  actions: Registry<ActionDef>;
  buildings: Registry<BuildingDef>;
  developments: Registry<DevelopmentDef>;
  populations: Registry<PopulationDef>;
  phases: PhaseDef[];
  start: StartConfig;
  rules?: RuleSet;
  config?: GameConfig;
}) {
  registerCoreEffects();
  registerCoreEvaluators();
  registerCoreRequirements();

  const resolvedRules = rules || DefaultRules;
  const services = new Services(resolvedRules);
  const passives = new PassiveManager();
  const game = new GameState('Player A', 'Player B');

  if (config) {
    const cfg = validateGameConfig(config);
    if (cfg.actions) {
      const registry = new Registry<ActionDef>(actionSchema);
      for (const action of cfg.actions) registry.add(action.id, action);
      actions = registry;
    }
    if (cfg.buildings) {
      const registry = new Registry<BuildingDef>(buildingSchema);
      for (const building of cfg.buildings) registry.add(building.id, building);
      buildings = registry;
    }
    if (cfg.developments) {
      const registry = new Registry<DevelopmentDef>(developmentSchema);
      for (const development of cfg.developments)
        registry.add(development.id, development);
      developments = registry;
    }
    if (cfg.populations) {
      const registry = new Registry<PopulationDef>(populationSchema);
      for (const population of cfg.populations)
        registry.add(population.id, population);
      populations = registry;
    }
    if (cfg.start) start = cfg.start;
  }

  const compensations = {
    A: diffPlayerStart(start.player, start.players?.['A']),
    B: diffPlayerStart(start.player, start.players?.['B']),
  } as Record<'A' | 'B', PlayerStartConfig>;

  const ctx = new EngineContext(
    game,
    services,
    actions,
    buildings,
    developments,
    populations,
    passives,
    phases,
    compensations,
  );
  const playerA = ctx.game.players[0]!;
  const playerB = ctx.game.players[1]!;

  applyPlayerStart(playerA, start.player, resolvedRules);
  applyPlayerStart(playerB, start.player, resolvedRules);
  ctx.game.currentPlayerIndex = 0;
  ctx.game.currentPhase = phases[0]?.id || '';
  ctx.game.currentStep = phases[0]?.steps[0]?.id || '';

  return ctx;
}

export {
  Resource,
  Phase,
  PopulationRole,
  Stat,
  EFFECTS,
  EVALUATORS,
  EngineContext,
  Services,
  PassiveManager,
  DefaultRules,
};

export type { RuleSet, ResourceKey };
export { registerCoreEffects, EffectRegistry, runEffects } from './effects';
export type { EffectHandler, EffectDef } from './effects';
export { applyParamsToEffects } from './utils';
export { registerCoreEvaluators, EvaluatorRegistry } from './evaluators';
export type { EvaluatorHandler, EvaluatorDef } from './evaluators';
export { registerCoreRequirements, RequirementRegistry } from './requirements';
export type { RequirementHandler, RequirementDef } from './requirements';
export { validateGameConfig } from './config/schema';
export type { GameConfig } from './config/schema';
