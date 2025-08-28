import { Registry } from '../registry';
import type { EngineContext } from '../context';
import { EVALUATORS } from '../evaluators';
import type { EvaluatorDef } from '../evaluators';
import { landAdd } from './land_add';
import { resourceAdd } from './resource_add';
import { resourceRemove } from './resource_remove';
import { buildingAdd } from './building_add';
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

export interface EffectDef<
  P extends Record<string, unknown> = Record<string, unknown>,
> {
  type?: string | undefined;
  method?: string | undefined;
  params?: P | undefined;
  effects?: EffectDef[] | undefined;
  evaluator?: EvaluatorDef | undefined;
  round?: 'up' | 'down' | undefined;
}

export interface EffectHandler<
  P extends Record<string, unknown> = Record<string, unknown>,
> {
  (effect: EffectDef<P>, ctx: EngineContext, mult: number): void;
}

export class EffectRegistry extends Registry<EffectHandler> {}
export const EFFECTS = new EffectRegistry();

export function registerCoreEffects(registry: EffectRegistry = EFFECTS) {
  registry.add('land:add', landAdd);
  registry.add('resource:add', resourceAdd);
  registry.add('resource:remove', resourceRemove);
  registry.add('building:add', buildingAdd);
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
}

export function runEffects(effects: EffectDef[], ctx: EngineContext, mult = 1) {
  for (const effect of effects) {
    if (effect.evaluator) {
      const evaluatorHandler = EVALUATORS.get(effect.evaluator.type);
      const count = evaluatorHandler(effect.evaluator, ctx);
      runEffects(effect.effects || [], ctx, mult * (count as number));
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
  buildingAdd,
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
};
