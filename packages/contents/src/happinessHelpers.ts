import type { EffectConfig } from '@kingdom-builder/protocol';
import {
	Types,
	CostModMethods,
	ResultModMethods,
	StatMethods,
	costModParams,
	developmentTarget,
	resultModParams,
	statParams,
	effect,
	PassiveMethods,
} from './config/builders';
import type { passiveParams } from './config/builders';
import { Resource } from './resources';
import { Stat } from './stats';

export const GROWTH_PHASE_ID = 'growth';
export const UPKEEP_PHASE_ID = 'upkeep';
export const WAR_RECOVERY_STEP_ID = 'war-recovery';
const BUILD_ACTION_ID = 'build';

const DEVELOPMENT_EVALUATION = developmentTarget();

export const incomeModifier = (id: string, percent: number) =>
	({
		type: Types.ResultMod,
		method: ResultModMethods.ADD,
		params: resultModParams()
			.id(id)
			.evaluation(DEVELOPMENT_EVALUATION)
			.percent(percent)
			.build(),
	}) as const;

export const buildingDiscountModifier = (id: string) =>
	({
		type: Types.CostMod,
		method: CostModMethods.ADD,
		params: costModParams()
			.id(id)
			.actionId(BUILD_ACTION_ID)
			.key(Resource.gold)
			.percent(-0.2)
			.build(),
	}) as const;

export const growthBonusEffect = (amount: number) =>
	({
		type: Types.Stat,
		method: StatMethods.ADD,
		params: statParams().key(Stat.growth).amount(amount).build(),
	}) as const;

export const formatRemoval = (description: string) =>
	`Active as long as ${description}`;

type TierPassiveEffectOptions = {
	tierId: string;
	summary: string;
	removalDetail: string;
	params: ReturnType<typeof passiveParams>;
	effects?: EffectConfig[];
};

export function createTierPassiveEffect({
	tierId,
	summary,
	removalDetail,
	params,
	effects = [],
}: TierPassiveEffectOptions) {
	params.detail(summary);
	params.meta({
		source: { type: 'tiered-resource', id: tierId },
		removal: { token: removalDetail, text: formatRemoval(removalDetail) },
	});
	const builder = effect()
		.type(Types.Passive)
		.method(PassiveMethods.ADD)
		.params(params);
	effects.forEach((entry) => builder.effect(entry));
	return builder;
}
