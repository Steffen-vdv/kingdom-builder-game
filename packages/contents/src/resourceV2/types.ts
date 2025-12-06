import type { EffectDef } from '@kingdom-builder/protocol';

export interface ResourceV2Metadata {
	id: string;
	label: string;
	icon: string;
	description?: string;
	order?: number;
	tags?: readonly string[];
}

export interface ResourceV2Bounds {
	lowerBound?: number;
	upperBound?: number;
}

export interface ResourceV2GlobalCostConfig {
	amount: number;
}

export interface ResourceV2TierThreshold {
	min?: number;
	max?: number;
}

export interface ResourceV2TierDefinition {
	id: string;
	label: string;
	icon?: string;
	description?: string;
	order?: number;
	threshold: ResourceV2TierThreshold;
	enterEffects?: readonly EffectDef[];
	exitEffects?: readonly EffectDef[];
}

export interface ResourceV2TierTrackMetadata {
	id: string;
	label: string;
	icon?: string;
	description?: string;
	order?: number;
}

export interface ResourceV2TierTrack {
	metadata: ResourceV2TierTrackMetadata;
	tiers: readonly ResourceV2TierDefinition[];
}

/**
 * Triggers that run when a resource value changes.
 * Effects receive `{ delta, index, player, resourceId }` params.
 */
export interface ResourceV2Triggers {
	/**
	 * Effects to run when the resource value increases.
	 * Runs once per unit of increase.
	 */
	onValueIncrease?: readonly EffectDef[];
	/**
	 * Effects to run when the resource value decreases.
	 * Runs once per unit of decrease.
	 */
	onValueDecrease?: readonly EffectDef[];
}

export interface ResourceV2Definition extends ResourceV2Metadata, ResourceV2Bounds, ResourceV2Triggers {
	displayAsPercent?: boolean;
	allowDecimal?: boolean;
	trackValueBreakdown?: boolean;
	trackBoundBreakdown?: boolean;
	groupId?: string;
	groupOrder?: number;
	globalCost?: ResourceV2GlobalCostConfig;
	tierTrack?: ResourceV2TierTrack;
}

export interface ResourceV2GroupParent extends ResourceV2Metadata, ResourceV2Bounds {
	displayAsPercent?: boolean;
	trackValueBreakdown?: boolean;
	trackBoundBreakdown?: boolean;
	tierTrack?: ResourceV2TierTrack;
}

export interface ResourceV2GroupDefinition {
	id: string;
	order?: number;
	parent?: ResourceV2GroupParent;
}
