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

/**
 * Specifies which type of bound this resource represents.
 * - 'upper': This resource is the upper bound (max) of another resource.
 * - 'lower': This resource is the lower bound (min) of another resource.
 */
export type ResourceBoundType = 'upper' | 'lower';

/**
 * Configuration for a resource that acts as a bound of another resource.
 * The UI will display these together (e.g., "5/10" for current/max).
 */
export interface ResourceBoundOfConfig {
	/** The resource ID this resource is a bound of */
	resourceId: string;
	/** Whether this is an upper or lower bound */
	boundType: ResourceBoundType;
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
	/**
	 * Declares that this resource represents a bound of another resource.
	 * Used for UI display (e.g., showing "5/10" for current/max).
	 * Resources with boundOf should not be displayed independently in the UI.
	 */
	boundOf?: ResourceBoundOfConfig;
}

export interface ResourceV2GroupParent extends ResourceV2Metadata, ResourceV2Bounds {
	displayAsPercent?: boolean;
	trackValueBreakdown?: boolean;
	trackBoundBreakdown?: boolean;
	tierTrack?: ResourceV2TierTrack;
}

export interface ResourceV2GroupDefinition {
	id: string;
	/**
	 * Display label for the group in the resource bar.
	 * Falls back to parent.label if not set.
	 */
	label?: string;
	/**
	 * Display icon for the group in the resource bar.
	 * Falls back to parent.icon if not set.
	 */
	icon?: string;
	order?: number;
	parent?: ResourceV2GroupParent;
}

/**
 * A reference to a resource or resource group within a category.
 * The category contains these in display order.
 */
export type ResourceCategoryItem = { type: 'resource'; id: string } | { type: 'group'; id: string };

/**
 * A category groups resources and resource groups into a UI row.
 * Primary/Secondary categories dictate the resource bar layout.
 */
export interface ResourceCategoryDefinition {
	id: string;
	label: string;
	icon?: string;
	description?: string;
	order?: number;
	/**
	 * When true, this category contains core resources that are always visible.
	 * Resources in non-primary categories are only shown if their value has
	 * ever been non-zero (tracked via resourceTouched).
	 */
	isPrimary?: boolean;
	/** Resources and groups in this category, in display order */
	contents: readonly ResourceCategoryItem[];
}
