import type { ResourceKey, PlayerId } from '../state';
import type { EngineContext } from '../context';
import type { EffectDef } from '../effects';
import type { StatSourceFrame } from '../stat_sources';

export interface PassiveSummary {
	id: string;
	name?: string | undefined;
	icon?: string | undefined;
	detail?: string | undefined;
	meta?: PassiveMetadata | undefined;
}

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

export type PassiveRecord = PassiveSummary & {
	effects?: EffectDef[];
	onGrowthPhase?: EffectDef[];
	onUpkeepPhase?: EffectDef[];
	onBeforeAttacked?: EffectDef[];
	onAttackResolved?: EffectDef[];
	owner: PlayerId;
	frames: StatSourceFrame[];
	detail?: string;
	meta?: PassiveMetadata;
};

export type CostBag = { [resourceKey in ResourceKey]?: number };
export type CostModifierFlat = Partial<Record<ResourceKey, number>>;
export type CostModifierPercent = Partial<Record<ResourceKey, number>>;
export type CostModifierResult = {
	flat?: CostModifierFlat;
	percent?: CostModifierPercent;
};

export type CostModifier = (
	actionId: string,
	cost: CostBag,
	context: EngineContext,
) => CostModifierResult | void;

export type ResultModifier = (actionId: string, context: EngineContext) => void;

export type ResourceGain = {
	key: string;
	amount: number;
};

export type EvaluationModifierPercent =
	| number
	| Partial<Record<string, number>>;

export type EvaluationModifierResult = {
	percent?: EvaluationModifierPercent;
};

export type EvaluationModifier = (
	context: EngineContext,
	gains: ResourceGain[],
) => EvaluationModifierResult | void;
