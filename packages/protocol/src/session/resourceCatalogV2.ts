import type { EffectDef } from '../effects';

/**
 * Specifies which type of bound this resource represents.
 * - 'upper': This resource is the upper bound (max) of another resource.
 * - 'lower': This resource is the lower bound (min) of another resource.
 */
export type SessionResourceBoundType = 'upper' | 'lower';

/**
 * Configuration for a resource that acts as a bound of another resource.
 * The UI will display these together (e.g., "5/10" for current/max).
 */
export interface SessionResourceBoundOfConfigV2 {
	/** The resource ID this resource is a bound of */
	resourceId: string;
	/** Whether this is an upper or lower bound */
	boundType: SessionResourceBoundType;
}

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
	/**
	 * When set, declares that this resource represents a bound of another
	 * resource. Used by UI to display "current/max" pairs. Resources with
	 * boundOf should not be displayed independently in the UI.
	 */
	boundOf: SessionResourceBoundOfConfigV2 | null;
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

/**
 * An item within a ResourceCategory. Can reference either a single resource
 * or a resource group.
 */
export type SessionResourceCategoryItemV2 =
	| { type: 'resource'; id: string }
	| { type: 'group'; id: string };

/**
 * Defines a UI category that groups resources and resource groups into
 * a single display row. Categories are ordered for consistent rendering.
 */
export interface SessionResourceCategoryDefinitionV2 {
	id: string;
	label: string;
	icon: string | null;
	description: string | null;
	order: number | null;
	resolvedOrder: number;
	contents: readonly SessionResourceCategoryItemV2[];
}

export interface SessionResourceCategoryRegistryV2 {
	byId: Readonly<Record<string, SessionResourceCategoryDefinitionV2>>;
	ordered: readonly SessionResourceCategoryDefinitionV2[];
}

export interface SessionResourceCatalogV2 {
	resources: SessionResourceRegistryV2;
	groups: SessionResourceGroupRegistryV2;
	categories: SessionResourceCategoryRegistryV2;
}
