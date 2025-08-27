import type {
  ActionConfig,
  BuildingConfig,
  DevelopmentConfig,
  PopulationConfig,
} from './schema';
import type { ResourceKey } from '../state';
import type { EffectConfig } from './schema';
import type { EngineContext } from '../context';

class BaseBuilder<T extends { id: string; name: string }> {
  protected cfg: Partial<T>;
  constructor(id: string, name: string, base: Partial<T>) {
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
    const cfg = this.cfg as ActionConfig;
    cfg.baseCosts = cfg.baseCosts || {};
    cfg.baseCosts[key] = amount;
    return this;
  }
  requirement(req: (ctx: EngineContext) => unknown) {
    const cfg = this.cfg as ActionConfig;
    cfg.requirements = cfg.requirements || [];
    cfg.requirements.push(req);
    return this;
  }
  effect(effect: EffectConfig) {
    (this.cfg as ActionConfig).effects.push(effect);
    return this;
  }
}

export class BuildingBuilder extends BaseBuilder<BuildingConfig> {
  constructor(id: string, name: string) {
    super(id, name, { costs: {}, onBuild: [] });
  }
  cost(key: ResourceKey, amount: number) {
    (this.cfg as BuildingConfig).costs[key] = amount;
    return this;
  }
  onBuild(effect: EffectConfig) {
    const cfg = this.cfg as BuildingConfig;
    cfg.onBuild = cfg.onBuild || [];
    cfg.onBuild.push(effect);
    return this;
  }
  onDevelopmentPhase(effect: EffectConfig) {
    const cfg = this.cfg as BuildingConfig;
    cfg.onDevelopmentPhase = cfg.onDevelopmentPhase || [];
    cfg.onDevelopmentPhase.push(effect);
    return this;
  }
  onUpkeepPhase(effect: EffectConfig) {
    const cfg = this.cfg as BuildingConfig;
    cfg.onUpkeepPhase = cfg.onUpkeepPhase || [];
    cfg.onUpkeepPhase.push(effect);
    return this;
  }
  onAttackResolved(effect: EffectConfig) {
    const cfg = this.cfg as BuildingConfig;
    cfg.onAttackResolved = cfg.onAttackResolved || [];
    cfg.onAttackResolved.push(effect);
    return this;
  }
}

export class DevelopmentBuilder extends BaseBuilder<DevelopmentConfig> {
  constructor(id: string, name: string) {
    super(id, name, {});
  }
  onBuild(effect: EffectConfig) {
    const cfg = this.cfg as DevelopmentConfig;
    cfg.onBuild = cfg.onBuild || [];
    cfg.onBuild.push(effect);
    return this;
  }
  onDevelopmentPhase(effect: EffectConfig) {
    const cfg = this.cfg as DevelopmentConfig;
    cfg.onDevelopmentPhase = cfg.onDevelopmentPhase || [];
    cfg.onDevelopmentPhase.push(effect);
    return this;
  }
  onAttackResolved(effect: EffectConfig) {
    const cfg = this.cfg as DevelopmentConfig;
    cfg.onAttackResolved = cfg.onAttackResolved || [];
    cfg.onAttackResolved.push(effect);
    return this;
  }
}

export class PopulationBuilder extends BaseBuilder<PopulationConfig> {
  constructor(id: string, name: string) {
    super(id, name, {});
  }
  onDevelopmentPhase(effect: EffectConfig) {
    const cfg = this.cfg as PopulationConfig;
    cfg.onDevelopmentPhase = cfg.onDevelopmentPhase || [];
    cfg.onDevelopmentPhase.push(effect);
    return this;
  }
  onUpkeepPhase(effect: EffectConfig) {
    const cfg = this.cfg as PopulationConfig;
    cfg.onUpkeepPhase = cfg.onUpkeepPhase || [];
    cfg.onUpkeepPhase.push(effect);
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
