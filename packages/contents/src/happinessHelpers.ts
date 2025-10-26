import type { EffectConfig, PassiveMetadata } from '@kingdom-builder/protocol';
import type { ResourceV2TierTrackMetadata } from './resourceV2';
import { costModParams, developmentTarget, resultModParams, statAddEffect, effect } from './config/builders';
import { Types, CostModMethods, ResultModMethods, PassiveMethods } from './config/builderShared';
import { formatPassiveRemoval } from './text';
import type { passiveParams } from './config/builders';
import type { ResourceKey } from './resourceKeys';
import type { StatKey } from './stats';

export type HappinessTierSlug = 'despair' | 'misery' | 'grim' | 'unrest' | 'steady' | 'content' | 'joyful' | 'elated' | 'ecstatic';

export type HappinessModifierKind = string;

export const happinessTierId = (slug: HappinessTierSlug) => `happiness:tier:${slug}`;

export const happinessPassiveId = (slug: HappinessTierSlug) => `passive:happiness:${slug}`;

export const happinessModifierId = (slug: HappinessTierSlug, kind: HappinessModifierKind) => `happiness:${slug}:${kind}`;

export const incomeModifier = (id: string, percent: number) =>
	effect(Types.ResultMod, ResultModMethods.ADD).round('up').params(resultModParams().id(id).evaluation(developmentTarget()).percent(percent).build()).build();

const GOLD_RESOURCE_KEY: ResourceKey = 'gold';
const GROWTH_STAT_KEY: StatKey = 'growth';

export const actionDiscountModifier = (id: string) => effect(Types.CostMod, CostModMethods.ADD).round('up').params(costModParams().id(id).key(GOLD_RESOURCE_KEY).percent(-0.2).build()).build();

export const growthBonusEffect = (amount: number) => statAddEffect(GROWTH_STAT_KEY, amount);

type TierPassiveEffectOptions = {
	tierId: string;
	resourceId: string;
	tierTrackMetadata: ResourceV2TierTrackMetadata;
	summary: string;
	summaryToken?: string;
	removalDetail: string;
	params: ReturnType<typeof passiveParams>;
	effects?: EffectConfig[];
	icon?: string;
	name?: string;
};

type TierPassiveMetadata = PassiveMetadata & {
	resourceId: string;
	tierTrack: ResourceV2TierTrackMetadata;
	tierId: string;
};

export function createTierPassiveEffect({ tierId, resourceId, tierTrackMetadata, summary, summaryToken, removalDetail, params, effects = [], icon, name }: TierPassiveEffectOptions) {
	params.detail(summaryToken ?? summary);
	if (name) {
		params.name(name);
	}
	if (icon) {
		params.icon(icon);
	}
	const removalText = formatPassiveRemoval(removalDetail);
	const metadata: TierPassiveMetadata = {
		resourceId,
		tierTrack: tierTrackMetadata,
		tierId,
		source: {
			type: 'tiered-resource',
			id: tierId,
			...(summaryToken ? { labelToken: summaryToken } : {}),
			...(icon ? { icon } : {}),
		},
		removal: {
			token: removalDetail,
			text: removalText,
		},
	};
	params.meta(metadata);
	const builder = effect().type(Types.Passive).method(PassiveMethods.ADD).params(params);
	effects.forEach((entry) => builder.effect(entry));
	return builder;
}
