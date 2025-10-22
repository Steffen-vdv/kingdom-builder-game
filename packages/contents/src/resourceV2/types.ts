import type { EffectDef } from '@kingdom-builder/protocol';

export interface ResourceV2Metadata {
	id: string;
	label: string;
	icon: string;
	description?: string;
	order?: number;
	tags?: string[];
}

export interface ResourceV2TierRange {
	min?: number;
	max?: number;
}

export interface ResourceV2TierThreshold {
	range: ResourceV2TierRange;
	enterEffects?: EffectDef[];
	exitEffects?: EffectDef[];
}

export interface ResourceV2TierTrack extends ResourceV2Metadata {
	thresholds: ResourceV2TierThreshold[];
}

export interface ResourceV2GlobalCostConfig {
	amount: number;
}

export interface ResourceV2Def extends ResourceV2Metadata {
	lowerBound?: number;
	upperBound?: number;
	displayAsPercent?: boolean;
	trackValueBreakdown?: boolean;
	trackBoundBreakdown?: boolean;
	groupId?: string;
	groupOrder?: number;
	globalCost?: ResourceV2GlobalCostConfig;
	tierTrack?: ResourceV2TierTrack;
}

export type ResourceV2GroupParent = ResourceV2Metadata;

export interface ResourceV2GroupDef {
	id: string;
	label: string;
	order?: number;
	parent?: ResourceV2GroupParent;
}
