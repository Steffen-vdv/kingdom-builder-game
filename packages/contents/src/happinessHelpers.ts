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
import { ACTION_ID, type ActionId } from './actions';
import { formatPassiveRemoval } from './text';

export const GROWTH_PHASE_ID = 'growth';
export const UPKEEP_PHASE_ID = 'upkeep';
export const WAR_RECOVERY_STEP_ID = 'war-recovery';
const BUILD_ACTION_ID: ActionId = ACTION_ID.build;

const DEVELOPMENT_EVALUATION = developmentTarget();

export const incomeModifier = (id: string, percent: number) =>
	effect(Types.ResultMod, ResultModMethods.ADD)
		.round('up')
		.params(
			resultModParams()
				.id(id)
				.evaluation(DEVELOPMENT_EVALUATION)
				.percent(percent)
				.build(),
		)
		.build();

export const buildingDiscountModifier = (id: string) =>
	effect(Types.CostMod, CostModMethods.ADD)
		.round('up')
		.params(
			costModParams()
				.id(id)
				.actionId(BUILD_ACTION_ID)
				.key(Resource.gold)
				.percent(-0.2)
				.build(),
		)
		.build();

export const growthBonusEffect = (amount: number) =>
	({
		type: Types.Stat,
		method: StatMethods.ADD,
		params: statParams().key(Stat.growth).amount(amount).build(),
	}) as const;

type TierPassiveEffectOptions = {
	tierId: string;
	summary: string;
	summaryToken?: string;
	removalDetail: string;
	params: ReturnType<typeof passiveParams>;
	effects?: EffectConfig[];
	icon?: string;
	name?: string;
};

export function createTierPassiveEffect({
	tierId,
	summary,
	summaryToken,
	removalDetail,
	params,
	effects = [],
	icon,
	name,
}: TierPassiveEffectOptions) {
	params.detail(summaryToken ?? summary);
	if (name) {
		params.name(name);
	}
	if (icon) {
		params.icon(icon);
	}
	params.meta({
		source: {
			type: 'tiered-resource',
			id: tierId,
			...(summaryToken ? { labelToken: summaryToken } : {}),
			...(name ? { name } : {}),
			...(icon ? { icon } : {}),
		},
		removal: {
			token: removalDetail,
			text: formatPassiveRemoval(removalDetail),
		},
	});
	const builder = effect()
		.type(Types.Passive)
		.method(PassiveMethods.ADD)
		.params(params);
	effects.forEach((entry) => builder.effect(entry));
	return builder;
}
