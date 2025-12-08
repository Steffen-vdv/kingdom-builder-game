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
	title?: string;
};

export type TierEffect = {
	incomeMultiplier: number;
	buildingDiscountPct?: number;
	growthBonusPct?: number;
	upkeepCouncilReduction?: number;
	halveCouncilAPInUpkeep?: boolean;
	disableGrowth?: boolean;
};

export type WinConditionOutcome = 'victory' | 'defeat' | 'none';

export type WinConditionResult = {
	subject: WinConditionOutcome;
	opponent?: WinConditionOutcome;
};

export type WinConditionDisplay = {
	icon?: string;
	victory?: string;
	defeat?: string;
};

export type WinConditionResourceTrigger = {
	type: 'resource';
	resourceId: string;
	comparison: 'lt' | 'lte' | 'gt' | 'gte';
	value: number;
	target: 'self' | 'opponent';
};

export type WinConditionTrigger = WinConditionResourceTrigger;

export type WinConditionDefinition = {
	id: string;
	trigger: WinConditionTrigger;
	result: WinConditionResult;
	display?: WinConditionDisplay;
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

export type CorePhaseIds = {
	growth: string;
	upkeep: string;
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
	winConditions: WinConditionDefinition[];
	corePhaseIds?: CorePhaseIds;
};
