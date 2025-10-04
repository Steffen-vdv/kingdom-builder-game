import type { ResourceKey } from '../state';
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

export type RuleSet = {
	defaultActionAPCost: number;
	absorptionCapPct: number;
	absorptionRounding: 'down' | 'up' | 'nearest';
	tieredResourceKey: ResourceKey;
	tierDefinitions: HappinessTierDefinition[];
	slotsPerNewLand: number;
	maxSlotsPerLand: number;
	basePopulationCap: number;
};

export class TieredResourceService {
	resourceKey: ResourceKey;

	constructor(private rules: RuleSet) {
		this.resourceKey = rules.tieredResourceKey;
	}

	definition(value: number): HappinessTierDefinition | undefined {
		let match: HappinessTierDefinition | undefined;
		for (const tier of this.rules.tierDefinitions) {
			if (value < tier.range.min) {
				break;
			}
			if (tier.range.max !== undefined && value > tier.range.max) {
				continue;
			}
			match = tier;
		}
		return match;
	}

	tier(value: number): TierEffect | undefined {
		return this.definition(value)?.effect;
	}
}
