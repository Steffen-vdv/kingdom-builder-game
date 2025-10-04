import type { EffectDef } from '../effects';

export type TierRange = {
	min: number;
	max?: number;
};

export type TierPassiveSkipStep = {
	phaseId: string;
	stepId: string;
};

export type TierPassiveSkipConfig = {
	phases?: string[];
	steps?: TierPassiveSkipStep[];
};

export type TierPassiveTextTokens = {
	summary?: string;
	description?: string;
	removal?: string;
};

export type TierPassivePayload = {
	id: string;
	effects?: EffectDef[];
	onGrowthPhase?: EffectDef[];
	onUpkeepPhase?: EffectDef[];
	onBeforeAttacked?: EffectDef[];
	onAttackResolved?: EffectDef[];
	onPayUpkeepStep?: EffectDef[];
	onGainIncomeStep?: EffectDef[];
	onGainAPStep?: EffectDef[];
	skip?: TierPassiveSkipConfig;
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
	passive: TierPassivePayload;
	display?: TierDisplayMetadata;
};
