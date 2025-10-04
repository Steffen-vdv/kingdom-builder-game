import type { EngineContext } from '../context';
import type { ResourceKey } from '../state';

export interface PassiveSourceMetadata {
	readonly type: string;
	readonly id: string;
	readonly icon?: string;
	readonly labelToken?: string;
}

export interface PassiveRemovalMetadata {
	readonly token?: string;
	readonly text?: string;
}

export interface PassiveMetadata {
	readonly source?: PassiveSourceMetadata;
	readonly removal?: PassiveRemovalMetadata;
}

export interface PassiveSummary {
	readonly id: string;
	readonly name?: string;
	readonly icon?: string;
	readonly detail?: string;
	readonly meta?: PassiveMetadata;
}

export type CostBag = Partial<Record<ResourceKey, number>>;
export type CostModifierFlat = Partial<Record<ResourceKey, number>>;
export type CostModifierPercent = Partial<Record<ResourceKey, number>>;
export interface CostModifierResult {
	readonly flat?: CostModifierFlat;
	readonly percent?: CostModifierPercent;
}

export type CostModifier = (
	actionId: string,
	cost: CostBag,
	ctx: EngineContext,
) => CostModifierResult | void;

export type ResultModifier = (actionId: string, ctx: EngineContext) => void;

export interface ResourceGain {
	key: string;
	amount: number;
}

export type EvaluationModifierPercent =
	| number
	| Partial<Record<string, number>>;

export interface EvaluationModifierResult {
	readonly percent?: EvaluationModifierPercent;
}

export type EvaluationModifier = (
	ctx: EngineContext,
	gains: ResourceGain[],
) => EvaluationModifierResult | void;
