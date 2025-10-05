import type { EffectConfig } from '@kingdom-builder/protocol';
import {
	costModParams,
	developmentTarget,
	resultModParams,
	statAddEffect,
	effect,
} from './config/builders';
import {
	Types,
	CostModMethods,
	ResultModMethods,
	PassiveMethods,
} from './config/builderShared';
import { ActionId } from './actions';
import type { passiveParams } from './config/builders';
import { Resource } from './resources';
import { Stat } from './stats';
import { formatPassiveRemoval } from './text';

export type HappinessTierSlug =
	| 'despair'
	| 'misery'
	| 'grim'
	| 'unrest'
	| 'steady'
	| 'content'
	| 'joyful'
	| 'elated'
	| 'ecstatic';

export type HappinessModifierKind = string;

export const happinessTierId = (slug: HappinessTierSlug) =>
	`happiness:tier:${slug}`;

export const happinessPassiveId = (slug: HappinessTierSlug) =>
	`passive:happiness:${slug}`;

export const happinessModifierId = (
	slug: HappinessTierSlug,
	kind: HappinessModifierKind,
) => `happiness:${slug}:${kind}`;

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
				.actionId(ActionId.build)
				.key(Resource.gold)
				.percent(-0.2)
				.build(),
		)
		.build();

export const growthBonusEffect = (amount: number) =>
	statAddEffect(Stat.growth, amount);

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
