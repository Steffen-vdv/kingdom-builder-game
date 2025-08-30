import type {
  ActionConfig,
  BuildingConfig,
  DevelopmentConfig,
  PopulationConfig,
  RequirementConfig,
  EffectConfig,
} from './schema';
import type { ResourceKey } from '../state';

class BaseBuilder<T extends { id: string; name: string }> {
  protected config: T;
  constructor(id: string, name: string, base: Omit<T, 'id' | 'name'>) {
    this.config = { id, name, ...base } as T;
  }
  build(): T {
    return this.config;
  }
}

export class ActionBuilder extends BaseBuilder<ActionConfig> {
  constructor(id: string, name: string) {
    super(id, name, { effects: [] });
  }
  cost(key: ResourceKey, amount: number) {
    this.config.baseCosts = this.config.baseCosts || {};
    this.config.baseCosts[key] = amount;
    return this;
  }
  requirement(req: RequirementConfig) {
    this.config.requirements = this.config.requirements || [];
    this.config.requirements.push(req);
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
  unlock(req: RequirementConfig) {
    this.config.unlockedBy = this.config.unlockedBy || [];
    this.config.unlockedBy.push(req);
    return this;
  }
}

export class BuildingBuilder extends BaseBuilder<BuildingConfig> {
  constructor(id: string, name: string) {
    super(id, name, { costs: {}, onBuild: [] });
  }
  cost(key: ResourceKey, amount: number) {
    this.config.costs[key] = amount;
    return this;
  }
  onBuild(effect: EffectConfig) {
    this.config.onBuild!.push(effect);
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
  onAttackResolved(effect: EffectConfig) {
    this.config.onAttackResolved = this.config.onAttackResolved || [];
    this.config.onAttackResolved.push(effect);
    return this;
  }
}

export class DevelopmentBuilder extends BaseBuilder<DevelopmentConfig> {
  constructor(id: string, name: string) {
    super(id, name, {});
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
  onAttackResolved(effect: EffectConfig) {
    this.config.onAttackResolved = this.config.onAttackResolved || [];
    this.config.onAttackResolved.push(effect);
    return this;
  }
  system(flag = true) {
    this.config.system = flag;
    return this;
  }
  unlock(req: RequirementConfig) {
    this.config.unlockedBy = this.config.unlockedBy || [];
    this.config.unlockedBy.push(req);
    return this;
  }
}

export class PopulationBuilder extends BaseBuilder<PopulationConfig> {
  constructor(id: string, name: string) {
    super(id, name, {});
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

export function action(id: string, name: string) {
  return new ActionBuilder(id, name);
}
export function building(id: string, name: string) {
  return new BuildingBuilder(id, name);
}
export function development(id: string, name: string) {
  return new DevelopmentBuilder(id, name);
}
export function population(id: string, name: string) {
  return new PopulationBuilder(id, name);
}
