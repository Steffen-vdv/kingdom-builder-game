import type {
  ActionConfig,
  BuildingConfig,
  DevelopmentConfig,
  PopulationConfig,
} from './schema';
import type { ResourceKey } from '../state';
import type { EffectConfig } from './schema';

class BaseBuilder<T extends { id: string; name: string }> {
  protected cfg: any;
  constructor(id: string, name: string, base: any) {
    this.cfg = { id, name, ...base };
  }
  build(): T {
    return this.cfg as T;
  }
}

export class ActionBuilder extends BaseBuilder<ActionConfig> {
  constructor(id: string, name: string) {
    super(id, name, { effects: [] });
  }
  cost(key: ResourceKey, amount: number) {
    this.cfg.baseCosts = this.cfg.baseCosts || {};
    this.cfg.baseCosts[key] = amount;
    return this;
  }
  requirement(req: (ctx: any) => any) {
    this.cfg.requirements = this.cfg.requirements || [];
    this.cfg.requirements.push(req);
    return this;
  }
  effect(effect: EffectConfig) {
    this.cfg.effects.push(effect);
    return this;
  }
}

export class BuildingBuilder extends BaseBuilder<BuildingConfig> {
  constructor(id: string, name: string) {
    super(id, name, { costs: {}, onBuild: [] });
  }
  cost(key: ResourceKey, amount: number) {
    this.cfg.costs[key] = amount;
    return this;
  }
  onBuild(effect: EffectConfig) {
    this.cfg.onBuild.push(effect);
    return this;
  }
  onDevelopmentPhase(effect: EffectConfig) {
    this.cfg.onDevelopmentPhase = this.cfg.onDevelopmentPhase || [];
    this.cfg.onDevelopmentPhase.push(effect);
    return this;
  }
  onUpkeepPhase(effect: EffectConfig) {
    this.cfg.onUpkeepPhase = this.cfg.onUpkeepPhase || [];
    this.cfg.onUpkeepPhase.push(effect);
    return this;
  }
  onAttackResolved(effect: EffectConfig) {
    this.cfg.onAttackResolved = this.cfg.onAttackResolved || [];
    this.cfg.onAttackResolved.push(effect);
    return this;
  }
}

export class DevelopmentBuilder extends BaseBuilder<DevelopmentConfig> {
  constructor(id: string, name: string) {
    super(id, name, {});
  }
  onBuild(effect: EffectConfig) {
    this.cfg.onBuild = this.cfg.onBuild || [];
    this.cfg.onBuild.push(effect);
    return this;
  }
  onDevelopmentPhase(effect: EffectConfig) {
    this.cfg.onDevelopmentPhase = this.cfg.onDevelopmentPhase || [];
    this.cfg.onDevelopmentPhase.push(effect);
    return this;
  }
  onAttackResolved(effect: EffectConfig) {
    this.cfg.onAttackResolved = this.cfg.onAttackResolved || [];
    this.cfg.onAttackResolved.push(effect);
    return this;
  }
}

export class PopulationBuilder extends BaseBuilder<PopulationConfig> {
  constructor(id: string, name: string) {
    super(id, name, {});
  }
  onDevelopmentPhase(effect: EffectConfig) {
    this.cfg.onDevelopmentPhase = this.cfg.onDevelopmentPhase || [];
    this.cfg.onDevelopmentPhase.push(effect);
    return this;
  }
  onUpkeepPhase(effect: EffectConfig) {
    this.cfg.onUpkeepPhase = this.cfg.onUpkeepPhase || [];
    this.cfg.onUpkeepPhase.push(effect);
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
