import type { EffectDef } from '../effects';

export type TierRange = {
	min: number;
	max?: number;
};

export type TierPassiveTextTokens = {
	summary?: string;
	description?: string;
	removal?: string;
};

export type TierPassivePreview = {
	id: string;
	effects?: EffectDef[];
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
	enterEffects?: EffectDef[];
	exitEffects?: EffectDef[];
	preview?: TierPassivePreview;
	text?: TierPassiveTextTokens;
	display?: TierDisplayMetadata;
};
