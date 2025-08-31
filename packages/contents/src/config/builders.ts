import type {
  ActionConfig,
  BuildingConfig,
  DevelopmentConfig,
  PopulationConfig,
  RequirementConfig,
  EffectConfig,
  StartConfig,
} from '@kingdom-builder/engine/config/schema';
import type {
  RuleSet,
  HappinessTierEffect,
} from '@kingdom-builder/engine/services';
import type { EvaluatorDef } from '@kingdom-builder/engine/evaluators';
import type { EffectDef } from '@kingdom-builder/engine/effects';
import type { ResourceKey, ResourceInfo } from '../resources';
import type { StatKey, StatInfo } from '../stats';
import type { PopulationRoleId, PopulationRoleInfo } from '../populationRoles';
import type { TriggerKey } from '../defs';

export const Types = {
  Land: 'land',
  Resource: 'resource',
  Building: 'building',
  Development: 'development',
  Passive: 'passive',
  CostMod: 'cost_mod',
  ResultMod: 'result_mod',
  Population: 'population',
  Action: 'action',
  Stat: 'stat',
} as const;

export const LandMethods = {
  ADD: 'add',
  TILL: 'till',
} as const;

export const ResourceMethods = {
  ADD: 'add',
  REMOVE: 'remove',
  TRANSFER: 'transfer',
} as const;

export const BuildingMethods = {
  ADD: 'add',
  REMOVE: 'remove',
} as const;

export const DevelopmentMethods = {
  ADD: 'add',
  REMOVE: 'remove',
} as const;

export const PassiveMethods = {
  ADD: 'add',
  REMOVE: 'remove',
} as const;

export const CostModMethods = {
  ADD: 'add',
  REMOVE: 'remove',
} as const;

export const ResultModMethods = {
  ADD: 'add',
  REMOVE: 'remove',
} as const;

export const PopulationMethods = {
  ADD: 'add',
  REMOVE: 'remove',
} as const;

export const ActionMethods = {
  ADD: 'add',
  REMOVE: 'remove',
  PERFORM: 'perform',
} as const;

export const StatMethods = {
  ADD: 'add',
  ADD_PCT: 'add_pct',
  REMOVE: 'remove',
} as const;

type Params = Record<string, unknown>;

export class EffectBuilder<P extends Params = Params> {
  private config: EffectConfig = {};
  type(type: string) {
    this.config.type = type;
    return this;
  }
  method(method: string) {
    this.config.method = method;
    return this;
  }
  param(key: string, value: unknown) {
    this.config.params = this.config.params || {};
    (this.config.params as Params)[key] = value;
    return this;
  }
  params(params: P) {
    this.config.params = params;
    return this;
  }
  effect(effect: EffectConfig) {
    this.config.effects = this.config.effects || [];
    this.config.effects.push(effect);
    return this;
  }
  evaluator(type: string, params?: Params) {
    this.config.evaluator = { type, params } as EvaluatorDef;
    return this;
  }
  round(mode: 'up' | 'down') {
    this.config.round = mode;
    return this;
  }
  build(): EffectConfig {
    return this.config;
  }
}

export function effect(type?: string, method?: string) {
  const builder = new EffectBuilder();
  if (type) builder.type(type);
  if (method) builder.method(method);
  return builder;
}

export class RequirementBuilder<P extends Params = Params> {
  private config: RequirementConfig = {} as RequirementConfig;
  type(type: string) {
    this.config.type = type;
    return this;
  }
  method(method: string) {
    this.config.method = method;
    return this;
  }
  param(key: string, value: unknown) {
    this.config.params = this.config.params || {};
    (this.config.params as Params)[key] = value;
    return this;
  }
  params(params: P) {
    this.config.params = params;
    return this;
  }
  message(message: string) {
    this.config.message = message;
    return this;
  }
  build(): RequirementConfig {
    return this.config;
  }
}

export function requirement(type?: string, method?: string) {
  const builder = new RequirementBuilder();
  if (type) builder.type(type);
  if (method) builder.method(method);
  return builder;
}

class BaseBuilder<T extends { id: string; name: string }> {
  protected config: Omit<T, 'id' | 'name'> &
    Partial<Pick<T, 'id' | 'name'>> & { icon?: string };
  constructor(base: Omit<T, 'id' | 'name'>) {
    this.config = {
      ...base,
    } as Omit<T, 'id' | 'name'> &
      Partial<Pick<T, 'id' | 'name'>> & {
        icon?: string;
      };
  }
  id(id: string) {
    this.config.id = id;
    return this;
  }
  name(name: string) {
    this.config.name = name;
    return this;
  }
  icon(icon: string) {
    this.config.icon = icon;
    return this;
  }
  build(): T {
    return this.config as T;
  }
}

export class ActionBuilder extends BaseBuilder<ActionConfig> {
  constructor() {
    super({ effects: [] });
  }
  cost(key: ResourceKey, amount: number) {
    this.config.baseCosts = this.config.baseCosts || {};
    this.config.baseCosts[key] = amount;
    return this;
  }
  requirement(req: RequirementConfig | RequirementBuilder) {
    const built = req instanceof RequirementBuilder ? req.build() : req;
    this.config.requirements = this.config.requirements || [];
    this.config.requirements.push(built);
    return this;
  }
  effect(effect: EffectConfig) {
    this.config.effects.push(effect);
    return this;
  }
  system(flag = true) {
    this.config.system = flag;
    return this;
  }
}

export class BuildingBuilder extends BaseBuilder<BuildingConfig> {
  constructor() {
    super({
      costs: { ap: 1 } as Record<ResourceKey, number>,
      onBuild: [],
    });
  }
  cost(key: ResourceKey, amount: number) {
    this.config.costs[key] = amount;
    return this;
  }
  onBuild(effect: EffectConfig) {
    this.config.onBuild = this.config.onBuild || [];
    this.config.onBuild.push(effect);
    return this;
  }
  onDevelopmentPhase(effect: EffectConfig) {
    this.config.onDevelopmentPhase = this.config.onDevelopmentPhase || [];
    this.config.onDevelopmentPhase.push(effect);
    return this;
  }
  onUpkeepPhase(effect: EffectConfig) {
    this.config.onUpkeepPhase = this.config.onUpkeepPhase || [];
    this.config.onUpkeepPhase.push(effect);
    return this;
  }
  onBeforeAttacked(effect: EffectConfig) {
    this.config.onBeforeAttacked = this.config.onBeforeAttacked || [];
    this.config.onBeforeAttacked.push(effect);
    return this;
  }
  onAttackResolved(effect: EffectConfig) {
    this.config.onAttackResolved = this.config.onAttackResolved || [];
    this.config.onAttackResolved.push(effect);
    return this;
  }
}

export class DevelopmentBuilder extends BaseBuilder<DevelopmentConfig> {
  constructor() {
    super({});
  }
  populationCap(amount: number) {
    this.config.populationCap = amount;
    return this;
  }
  onBuild(effect: EffectConfig) {
    this.config.onBuild = this.config.onBuild || [];
    this.config.onBuild.push(effect);
    return this;
  }
  onDevelopmentPhase(effect: EffectConfig) {
    this.config.onDevelopmentPhase = this.config.onDevelopmentPhase || [];
    this.config.onDevelopmentPhase.push(effect);
    return this;
  }
  onBeforeAttacked(effect: EffectConfig) {
    this.config.onBeforeAttacked = this.config.onBeforeAttacked || [];
    this.config.onBeforeAttacked.push(effect);
    return this;
  }
  onAttackResolved(effect: EffectConfig) {
    this.config.onAttackResolved = this.config.onAttackResolved || [];
    this.config.onAttackResolved.push(effect);
    return this;
  }
  system(flag = true) {
    this.config.system = flag;
    return this;
  }
}

export class PopulationBuilder extends BaseBuilder<PopulationConfig> {
  constructor() {
    super({});
  }
  onAssigned(effect: EffectConfig) {
    this.config.onAssigned = this.config.onAssigned || [];
    this.config.onAssigned.push(effect);
    return this;
  }
  onUnassigned(effect: EffectConfig) {
    this.config.onUnassigned = this.config.onUnassigned || [];
    this.config.onUnassigned.push(effect);
    return this;
  }
  onDevelopmentPhase(effect: EffectConfig) {
    this.config.onDevelopmentPhase = this.config.onDevelopmentPhase || [];
    this.config.onDevelopmentPhase.push(effect);
    return this;
  }
  onUpkeepPhase(effect: EffectConfig) {
    this.config.onUpkeepPhase = this.config.onUpkeepPhase || [];
    this.config.onUpkeepPhase.push(effect);
    return this;
  }
}

export function action() {
  return new ActionBuilder();
}
export function building() {
  return new BuildingBuilder();
}
export function development() {
  return new DevelopmentBuilder();
}
export function population() {
  return new PopulationBuilder();
}

// Generic info builder for simple keyed entries
class InfoBuilder<
  T extends {
    key: string;
    icon?: string;
    label?: string;
    description?: string;
  },
> {
  protected config: Partial<T> = {};
  id(key: T['key']) {
    this.config.key = key;
    return this;
  }
  icon(icon: string) {
    this.config.icon = icon as T['icon'];
    return this;
  }
  label(label: string) {
    this.config.label = label as T['label'];
    return this;
  }
  description(description: string) {
    this.config.description = description as T['description'];
    return this;
  }
  build(): T {
    return this.config as T;
  }
}

export class ResourceInfoBuilder extends InfoBuilder<ResourceInfo> {}
export function resourceInfo() {
  return new ResourceInfoBuilder();
}

export class StatInfoBuilder extends InfoBuilder<StatInfo> {
  addFormat(format: NonNullable<StatInfo['addFormat']>) {
    this.config.addFormat = format;
    return this;
  }
}
export function statInfo() {
  return new StatInfoBuilder();
}

export class PopulationRoleInfoBuilder extends InfoBuilder<PopulationRoleInfo> {}
export function populationRoleInfo() {
  return new PopulationRoleInfoBuilder();
}

export class ModifierInfoBuilder extends InfoBuilder<{
  key: string;
  icon: string;
  label: string;
}> {}
export function modifierInfo() {
  return new ModifierInfoBuilder();
}

// Phase and Step builders
export interface StepDef {
  id: string;
  title?: string;
  triggers?: TriggerKey[];
  effects?: EffectDef[];
  icon?: string;
}

export interface PhaseDef {
  id: string;
  steps: StepDef[];
  action?: boolean;
  label: string;
  icon?: string;
}

export class StepBuilder {
  private config: StepDef = { id: '', effects: [] };
  id(id: string) {
    this.config.id = id;
    return this;
  }
  title(title: string) {
    this.config.title = title;
    return this;
  }
  icon(icon: string) {
    this.config.icon = icon;
    return this;
  }
  trigger(trigger: TriggerKey) {
    this.config.triggers = this.config.triggers || [];
    this.config.triggers.push(trigger);
    return this;
  }
  effect(effect: EffectDef) {
    this.config.effects = this.config.effects || [];
    this.config.effects.push(effect);
    return this;
  }
  build(): StepDef {
    return this.config;
  }
}

export class PhaseBuilder {
  private config: PhaseDef = { id: '', label: '', steps: [] };
  id(id: string) {
    this.config.id = id;
    return this;
  }
  label(label: string) {
    this.config.label = label;
    return this;
  }
  icon(icon: string) {
    this.config.icon = icon;
    return this;
  }
  action(flag = true) {
    this.config.action = flag;
    return this;
  }
  step(step: StepDef | StepBuilder) {
    const built = step instanceof StepBuilder ? step.build() : step;
    this.config.steps.push(built);
    return this;
  }
  build(): PhaseDef {
    return this.config;
  }
}

export function step() {
  return new StepBuilder();
}
export function phase() {
  return new PhaseBuilder();
}

// Rules builder
export class RulesBuilder {
  private config: RuleSet = {
    defaultActionAPCost: 1,
    absorptionCapPct: 1,
    absorptionRounding: 'down',
    happinessTiers: [],
    slotsPerNewLand: 1,
    maxSlotsPerLand: 2,
    basePopulationCap: 1,
  };
  defaultActionAPCost(cost: number) {
    this.config.defaultActionAPCost = cost;
    return this;
  }
  absorptionCapPct(pct: number) {
    this.config.absorptionCapPct = pct;
    return this;
  }
  absorptionRounding(mode: 'up' | 'down') {
    this.config.absorptionRounding = mode;
    return this;
  }
  happinessTier(threshold: number, effect: HappinessTierEffect) {
    this.config.happinessTiers.push({ threshold, effect });
    return this;
  }
  slotsPerNewLand(count: number) {
    this.config.slotsPerNewLand = count;
    return this;
  }
  maxSlotsPerLand(count: number) {
    this.config.maxSlotsPerLand = count;
    return this;
  }
  basePopulationCap(cap: number) {
    this.config.basePopulationCap = cap;
    return this;
  }
  build(): RuleSet {
    return this.config;
  }
}

export function rules() {
  return new RulesBuilder();
}

// Start config builder
class PlayerStartBuilder {
  private config: StartConfig['player'] & {
    resources: Partial<Record<ResourceKey, number>>;
    stats: Partial<Record<StatKey, number>>;
    population: Partial<Record<PopulationRoleId, number>>;
    lands: { developments?: string[] }[];
  } = {
    resources: {},
    stats: {},
    population: {},
    lands: [],
  };
  resource(key: ResourceKey, amount: number) {
    this.config.resources[key] = amount;
    return this;
  }
  stat(key: StatKey, amount: number) {
    this.config.stats[key] = amount;
    return this;
  }
  population(role: PopulationRoleId, amount: number) {
    this.config.population[role] = amount;
    return this;
  }
  land(developments: string[] = []) {
    this.config.lands.push({ developments });
    return this;
  }
  build(): StartConfig['player'] {
    return this.config;
  }
  partial(): Partial<StartConfig['player']> {
    const { resources, stats, population, lands } = this.config;
    const partial: Partial<StartConfig['player']> = {};
    if (Object.keys(resources).length) partial.resources = resources;
    if (Object.keys(stats).length) partial.stats = stats;
    if (Object.keys(population).length) partial.population = population;
    if (lands.length) partial.lands = lands;
    return partial;
  }
}

export class StartBuilder {
  private config: StartConfig & {
    players: Record<string, Partial<StartConfig['player']>>;
  } = {
    player: { resources: {}, stats: {}, population: {}, lands: [] },
    players: {},
  };
  player(setup: (b: PlayerStartBuilder) => void) {
    const builder = new PlayerStartBuilder();
    setup(builder);
    this.config.player = builder.build();
    return this;
  }
  bonus(id: string, setup: (b: PlayerStartBuilder) => void) {
    const builder = new PlayerStartBuilder();
    setup(builder);
    this.config.players[id] = builder.partial();
    return this;
  }
  build(): StartConfig {
    return this.config;
  }
}

export function start() {
  return new StartBuilder();
}
