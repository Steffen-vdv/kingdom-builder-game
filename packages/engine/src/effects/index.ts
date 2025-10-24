import { Registry } from '@kingdom-builder/protocol';
import type { EffectDef } from '@kingdom-builder/protocol';
import type { EngineContext } from '../context';
import { EVALUATORS } from '../evaluators';
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
import { resourceV2Add } from './resource_v2_add';
import { resourceV2Remove } from './resource_v2_remove';
import { resourceV2Transfer } from './resource_v2_transfer';
import { resourceV2UpperBoundIncrease } from './resource_v2_upper_bound_increase';

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

const flushResourceV2RecentGains = (context: EngineContext) => {
	for (const player of context.game.players) {
		const recent = player.resourceV2.recentGains;
		if (!recent.length) {
			continue;
		}
		for (const entry of recent) {
			if (entry.suppressHooks) {
				continue;
			}
			context.recentResourceGains.push({
				key: entry.key,
				amount: entry.amount,
				source: 'resourceV2',
			});
		}
		player.resetRecentResourceV2Gains();
	}
};

function withResourceV2Logging<P extends Record<string, unknown>>(
	handler: EffectHandler<P>,
): EffectHandler<P> {
	return (effect: EffectDef<P>, engineContext: EngineContext, mult: number) => {
		handler(effect, engineContext, mult);
		flushResourceV2RecentGains(engineContext);
	};
}

export function registerCoreEffects(
	registry: EffectRegistry = EFFECTS,
	costRegistry: EffectCostRegistry = EFFECT_COST_COLLECTORS,
) {
	registry.add('land:add', landAdd);
	registry.add('resource:add', withResourceV2Logging(resourceAdd));
	registry.add('resource:remove', withResourceV2Logging(resourceRemove));
	registry.add('resource:transfer', withResourceV2Logging(resourceTransfer));
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

	registry.add('resource_v2:add', withResourceV2Logging(resourceV2Add));
	registry.add('resource_v2:remove', withResourceV2Logging(resourceV2Remove));
	registry.add(
		'resource_v2:transfer',
		withResourceV2Logging(resourceV2Transfer),
	);
	registry.add(
		'resource_v2:upper_bound_increase',
		withResourceV2Logging(resourceV2UpperBoundIncrease),
	);

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
			withStatSourceFrames(engineContext, frame, () => {
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
	resourceV2Add,
	resourceV2Remove,
	resourceV2Transfer,
	resourceV2UpperBoundIncrease,
};
export type { EffectDef } from '@kingdom-builder/protocol';
