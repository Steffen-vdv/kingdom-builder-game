import { Registry } from '@kingdom-builder/protocol';
import type { EffectDef } from '@kingdom-builder/protocol';
import type { EngineContext } from '../context';
import { EVALUATORS } from '../evaluators';
import type { CostBag } from '../services';
import {
	collectEvaluatorDependencies,
	withResourceSourceFrames,
} from '../resource_sources';
import { landAdd } from './land_add';
import { resourceAdd, resourceRemove } from '../resource/effects/addRemove';
import {
	resourceIncreaseUpperBound,
	resourceTransfer,
} from '../resource/effects/transfer';
import { buildingAdd, collectBuildingAddCosts } from './building_add';
import { buildingRemove } from './building_remove';
import { developmentAdd } from './development_add';
import { developmentRemove } from './development_remove';
import { landTill } from './land_till';
import { passiveAdd } from './passive_add';
import { passiveRemove } from './passive_remove';
import { costMod } from './cost_mod';
import { resultMod } from './result_mod';
import { actionAdd } from './action_add';
import { actionRemove } from './action_remove';
import { actionPerform } from './action_perform';
import { attackPerform } from './attack';

export interface EffectHandler<
	P extends Record<string, unknown> = Record<string, unknown>,
> {
	(effect: EffectDef<P>, engineContext: EngineContext, mult: number): void;
}

export class EffectRegistry extends Registry<EffectHandler> {}
export const EFFECTS = new EffectRegistry();

export interface EffectCostCollector {
	(effect: EffectDef, base: CostBag, engineContext: EngineContext): void;
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
	registry.add('resource:upper-bound:increase', resourceIncreaseUpperBound);
	registry.add('building:add', buildingAdd);
	registry.add('building:remove', buildingRemove);
	registry.add('development:add', developmentAdd);
	registry.add('development:remove', developmentRemove);
	registry.add('land:till', landTill);
	registry.add('passive:add', passiveAdd);
	registry.add('passive:remove', passiveRemove);
	registry.add('cost_mod:add', costMod);
	registry.add('cost_mod:remove', costMod);
	registry.add('result_mod:add', resultMod);
	registry.add('result_mod:remove', resultMod);
	registry.add('action:add', actionAdd);
	registry.add('action:remove', actionRemove);
	registry.add('action:perform', actionPerform);
	registry.add('attack:perform', attackPerform);

	costRegistry.add('building:add', collectBuildingAddCosts);
}

export function runEffects(
	effects: EffectDef[],
	engineContext: EngineContext,
	mult = 1,
) {
	for (const effect of effects) {
		if (effect.evaluator) {
			const evaluatorHandler = EVALUATORS.get(effect.evaluator.type);
			const count = evaluatorHandler(effect.evaluator, engineContext);
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
			if (total === 0) {
				continue;
			}
			engineContext.recentResourceGains = [];
			withResourceSourceFrames(engineContext, frame, () => {
				runEffects(effect.effects || [], engineContext, total);
			});
			const gains = [...engineContext.recentResourceGains];
			engineContext.passives.runEvaluationMods(target, engineContext, gains);
		} else if (effect.type && effect.method) {
			const handler = EFFECTS.get(`${effect.type}:${effect.method}`);
			handler(effect, engineContext, mult);
		}
	}
}

export {
	landAdd,
	resourceAdd,
	resourceRemove,
	resourceIncreaseUpperBound,
	resourceTransfer,
	buildingAdd,
	buildingRemove,
	developmentAdd,
	developmentRemove,
	landTill,
	passiveAdd,
	passiveRemove,
	costMod,
	resultMod,
	actionAdd,
	actionRemove,
	actionPerform,
};
export type { EffectDef } from '@kingdom-builder/protocol';
