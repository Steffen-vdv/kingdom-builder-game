import type { EffectDef } from '../effects';

export type TierRange = {
	/** Inclusive lower bound for the tier. */
	min: number;
	/** Inclusive upper bound for the tier. Undefined means open ended. */
	max?: number;
};

export type TierPassiveTextTokens = {
	summary?: string;
	description?: string;
	removal?: string;
};

export type TierTransitionDefinition = {
	enter: EffectDef[];
	exit?: EffectDef[];
	text?: TierPassiveTextTokens;
};

export type TierDisplayMetadata = {
	removalCondition?: string;
	icon?: string;
	summaryToken?: string;
};

export type TierEffect = {
	incomeMultiplier: number;
	buildingDiscountPct?: number;
	growthBonusPct?: number;
	upkeepCouncilReduction?: number;
	halveCouncilAPInUpkeep?: boolean;
	disableGrowth?: boolean;
};

export type HappinessTierDefinition = {
	id: string;
	range: TierRange;
	effect: TierEffect;
	transition: TierTransitionDefinition;
	display?: TierDisplayMetadata;
};
