import { Registry } from '../registry';
import type { EngineContext } from '../context';
import { EVALUATORS } from '../evaluators';
import type { EvaluatorDef } from '../evaluators';
import type { CostBag } from '../services';
import {
  collectEvaluatorDependencies,
  withStatSourceFrames,
} from '../stat_sources';
import { landAdd } from './land_add';
import { resourceAdd } from './resource_add';
import { resourceRemove } from './resource_remove';
import { resourceTransfer } from './resource_transfer';
import { buildingAdd, collectBuildingAddCosts } from './building_add';
import { buildingRemove } from './building_remove';
import { statAdd } from './stat_add';
import { statAddPct } from './stat_add_pct';
import { statRemove } from './stat_remove';
import { developmentAdd } from './development_add';
import { developmentRemove } from './development_remove';
import { landTill } from './land_till';
import { passiveAdd } from './passive_add';
import { passiveRemove } from './passive_remove';
import { costMod } from './cost_mod';
import { resultMod } from './result_mod';
import { populationAdd } from './population_add';
import { populationRemove } from './population_remove';
import { actionAdd } from './action_add';
import { actionRemove } from './action_remove';
import { actionPerform } from './action_perform';
import { attackPerform } from './attack';

export interface EffectDef<
  P extends Record<string, unknown> = Record<string, unknown>,
> {
  type?: string | undefined;
  method?: string | undefined;
  params?: P | undefined;
  effects?: EffectDef[] | undefined;
  evaluator?: EvaluatorDef | undefined;
  round?: 'up' | 'down' | undefined;
  meta?: Record<string, unknown> | undefined;
}

export interface EffectHandler<
  P extends Record<string, unknown> = Record<string, unknown>,
> {
  (effect: EffectDef<P>, ctx: EngineContext, mult: number): void;
}

export class EffectRegistry extends Registry<EffectHandler> {}
export const EFFECTS = new EffectRegistry();

export interface EffectCostCollector {
  (effect: EffectDef, base: CostBag, ctx: EngineContext): void;
}

export class EffectCostRegistry extends Registry<EffectCostCollector> {}
export const EFFECT_COST_COLLECTORS = new EffectCostRegistry();

export function registerCoreEffects(
  registry: EffectRegistry = EFFECTS,
  costRegistry: EffectCostRegistry = EFFECT_COST_COLLECTORS,
) {
  registry.add('land:add', landAdd);
  registry.add('resource:add', resourceAdd);
  registry.add('resource:remove', resourceRemove);
  registry.add('resource:transfer', resourceTransfer);
  registry.add('building:add', buildingAdd);
  registry.add('building:remove', buildingRemove);
  registry.add('stat:add', statAdd);
  registry.add('stat:add_pct', statAddPct);
  registry.add('stat:remove', statRemove);
  registry.add('development:add', developmentAdd);
  registry.add('development:remove', developmentRemove);
  registry.add('land:till', landTill);
  registry.add('passive:add', passiveAdd);
  registry.add('passive:remove', passiveRemove);
  registry.add('cost_mod:add', costMod);
  registry.add('cost_mod:remove', costMod);
  registry.add('result_mod:add', resultMod);
  registry.add('result_mod:remove', resultMod);
  registry.add('population:add', populationAdd);
  registry.add('population:remove', populationRemove);
  registry.add('action:add', actionAdd);
  registry.add('action:remove', actionRemove);
  registry.add('action:perform', actionPerform);
  registry.add('attack:perform', attackPerform);

  costRegistry.add('building:add', collectBuildingAddCosts);
}

export function runEffects(effects: EffectDef[], ctx: EngineContext, mult = 1) {
  for (const effect of effects) {
    if (effect.evaluator) {
      const evaluatorHandler = EVALUATORS.get(effect.evaluator.type);
      const count = evaluatorHandler(effect.evaluator, ctx);
      const params = effect.evaluator.params as Record<string, unknown>;
      const target =
        params && 'id' in params
          ? `${effect.evaluator.type}:${String(params['id'])}`
          : effect.evaluator.type;
      const dependencies = collectEvaluatorDependencies(effect.evaluator);
      const frame = dependencies.length
        ? () => ({ dependsOn: dependencies })
        : undefined;
      const total = (count as number) * mult;
      if (total === 0) continue;
      ctx.recentResourceGains = [];
      withStatSourceFrames(ctx, frame, () => {
        runEffects(effect.effects || [], ctx, total);
      });
      const gains = [...ctx.recentResourceGains];
      ctx.passives.runEvaluationMods(target, ctx, gains);
    } else if (effect.type && effect.method) {
      const handler = EFFECTS.get(`${effect.type}:${effect.method}`);
      handler(effect, ctx, mult);
    }
  }
}

export {
  landAdd,
  resourceAdd,
  resourceRemove,
  resourceTransfer,
  buildingAdd,
  buildingRemove,
  statAdd,
  statAddPct,
  statRemove,
  developmentAdd,
  developmentRemove,
  landTill,
  passiveAdd,
  passiveRemove,
  costMod,
  resultMod,
  populationAdd,
  populationRemove,
  actionAdd,
  actionRemove,
  actionPerform,
};
