import type { EffectDef } from '../effects';

export interface SessionResourceTierThresholdV2 {
	min: number | null;
	max: number | null;
}

export interface SessionResourceTierDefinitionV2 {
	id: string;
	label: string;
	icon?: string;
	description?: string;
	order: number | null;
	resolvedOrder: number;
	threshold: SessionResourceTierThresholdV2;
	enterEffects: readonly EffectDef[];
	exitEffects: readonly EffectDef[];
}

export interface SessionResourceTierTrackMetadataV2 {
	id: string;
	label: string;
	icon?: string;
	description?: string;
	order: number | null;
	resolvedOrder: number;
}

export interface SessionResourceTierTrackV2 {
	metadata: SessionResourceTierTrackMetadataV2;
	tiers: readonly SessionResourceTierDefinitionV2[];
}

export interface SessionResourceMetadataV2 {
	id: string;
	label: string;
	icon: string;
	description: string | null;
	order: number | null;
	resolvedOrder: number;
	tags: readonly string[];
}

export interface SessionResourceBoundsV2 {
	lowerBound: number | null;
	upperBound: number | null;
}

export interface SessionResourceGlobalCostConfigV2 {
	amount: number;
}

export interface SessionResourceDefinitionV2
	extends SessionResourceMetadataV2, SessionResourceBoundsV2 {
	displayAsPercent: boolean;
	trackValueBreakdown: boolean;
	trackBoundBreakdown: boolean;
	groupId: string | null;
	groupOrder: number | null;
	resolvedGroupOrder: number | null;
	globalCost?: SessionResourceGlobalCostConfigV2;
	tierTrack?: SessionResourceTierTrackV2;
}

export interface SessionResourceGroupParentV2
	extends SessionResourceMetadataV2, SessionResourceBoundsV2 {
	displayAsPercent: boolean;
	trackValueBreakdown: boolean;
	trackBoundBreakdown: boolean;
	tierTrack?: SessionResourceTierTrackV2;
}

export interface SessionResourceGroupDefinitionV2 {
	id: string;
	order: number | null;
	resolvedOrder: number;
	parent?: SessionResourceGroupParentV2;
}

export interface SessionResourceRegistryV2 {
	byId: Readonly<Record<string, SessionResourceDefinitionV2>>;
	ordered: readonly SessionResourceDefinitionV2[];
}

export interface SessionResourceGroupRegistryV2 {
	byId: Readonly<Record<string, SessionResourceGroupDefinitionV2>>;
	ordered: readonly SessionResourceGroupDefinitionV2[];
}

export interface SessionResourceCatalogV2 {
	resources: SessionResourceRegistryV2;
	groups: SessionResourceGroupRegistryV2;
}
