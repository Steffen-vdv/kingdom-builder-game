import type {
  ActionConfig,
  BuildingConfig,
  DevelopmentConfig,
  PopulationConfig,
  RequirementConfig,
  EffectConfig,
} from '@kingdom-builder/engine/config/schema';
import type { ResourceKey } from '@kingdom-builder/engine/state';
import { Resource } from '@kingdom-builder/engine/state';
import type { EvaluatorDef } from '@kingdom-builder/engine/evaluators';

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
    super({ costs: { [Resource.ap]: 1 }, onBuild: [] });
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
