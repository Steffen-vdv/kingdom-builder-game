import type { EffectDef } from './effects';

export type PhaseSkipStep = {
	phaseId: string;
	stepId: string;
};

export type PhaseSkipConfig = {
	phases?: string[];
	steps?: PhaseSkipStep[];
};

export type PassiveSourceMetadata = {
	type: string;
	id: string;
	icon?: string;
	labelToken?: string;
};

export type PassiveRemovalMetadata = {
	token?: string;
	text?: string;
};

export type PassiveMetadata = {
	source?: PassiveSourceMetadata;
	removal?: PassiveRemovalMetadata;
};

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

export type RuleSet = {
	defaultActionAPCost: number;
	absorptionCapPct: number;
	absorptionRounding: 'down' | 'up' | 'nearest';
	tieredResourceKey: string;
	tierDefinitions: HappinessTierDefinition[];
	slotsPerNewLand: number;
	maxSlotsPerLand: number;
	basePopulationCap: number;
};
