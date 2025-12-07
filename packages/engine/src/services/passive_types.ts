import type { PlayerId } from '../state';
import type { EngineContext } from '../context';
import type { EffectDef } from '../effects';
import type { ResourceSourceFrame } from '../resource_sources';

export type PhaseSkipStep = {
	phaseId: string;
	stepId: string;
};

export type PhaseSkipConfig = {
	phases?: string[];
	steps?: PhaseSkipStep[];
};

export interface PassiveSummary {
	id: string;
	name?: string;
	icon?: string;
	detail?: string;
	meta?: PassiveMetadata;
}

export type PassiveSourceMetadata = {
	type: string;
	id: string;
	icon?: string;
	labelToken?: string;
	name?: string;
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
	frames: ResourceSourceFrame[];
	detail?: string;
	meta?: PassiveMetadata;
	skip?: PhaseSkipConfig;
	[trigger: string]: unknown;
};

export type CostBag = Record<string, number>;
export type CostModifierFlat = Record<string, number>;
export type CostModifierPercent = Record<string, number>;
export type RoundingMode = 'up' | 'down';
export type RoundingInstruction =
	| RoundingMode
	| Partial<Record<string, RoundingMode>>;
export type CostModifierResult = {
	flat?: CostModifierFlat;
	percent?: CostModifierPercent;
	round?: RoundingInstruction;
};

export type CostModifier = (
	actionId: string,
	cost: CostBag,
	context: EngineContext,
) => CostModifierResult | void;

export type ResultModifier = (actionId: string, context: EngineContext) => void;

export type ResourceGain = {
	resourceId: string;
	amount: number;
};

export type EvaluationModifierPercent =
	| number
	| Partial<Record<string, number>>;

export type EvaluationModifierResult = {
	percent?: EvaluationModifierPercent;
	round?: RoundingInstruction;
};

export type EvaluationModifier = (
	context: EngineContext,
	gains: ResourceGain[],
) => EvaluationModifierResult | void;
