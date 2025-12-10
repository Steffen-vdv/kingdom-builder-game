import type { EffectDef } from '../effects';

export interface ResourceMetadata {
	id: string;
	label: string;
	icon: string;
	description?: string;
	order?: number;
	tags?: readonly string[];
}

/**
 * Reconciliation modes for resource bounds.
 * - 'clamp': Clamp values to stay within bounds (default behavior)
 * - 'pass': Pass values through without bound checking (allows overflow)
 * - 'reject': Reject changes that would exceed bounds (throws error)
 */
export type ResourceReconciliationMode = 'clamp' | 'pass' | 'reject';

/**
 * A reference to another resource whose value acts as this bound.
 * When the referenced resource's value changes, reconciliation is applied.
 */
export interface ResourceBoundReference {
	/** The resource ID whose value determines this bound */
	readonly resourceId: string;
	/**
	 * How to reconcile when the bound changes and the current value
	 * would overflow/underflow. Default: 'clamp'
	 */
	readonly reconciliation?: ResourceReconciliationMode;
}

/** A bound can be a static number or a dynamic reference to another resource */
export type ResourceBoundValue = number | ResourceBoundReference;

export interface ResourceBounds {
	lowerBound?: ResourceBoundValue;
	upperBound?: ResourceBoundValue;
}

export interface ResourceGlobalCostConfig {
	amount: number;
}

export interface ResourceTierThreshold {
	min?: number;
	max?: number;
}

export interface ResourceTierDefinition {
	id: string;
	label: string;
	icon?: string;
	description?: string;
	order?: number;
	threshold: ResourceTierThreshold;
	enterEffects?: readonly EffectDef[];
	exitEffects?: readonly EffectDef[];
}

export interface ResourceTierTrackMetadata {
	id: string;
	label: string;
	icon?: string;
	description?: string;
	order?: number;
}

export interface ResourceTierTrack {
	metadata: ResourceTierTrackMetadata;
	tiers: readonly ResourceTierDefinition[];
}

/**
 * Triggers that run when a resource value changes.
 * Effects receive `{ delta, index, player, resourceId }` params.
 */
export interface ResourceTriggers {
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

export interface ResourceDefinition
	extends ResourceMetadata, ResourceBounds, ResourceTriggers {
	displayAsPercent?: boolean;
	allowDecimal?: boolean;
	trackValueBreakdown?: boolean;
	trackBoundBreakdown?: boolean;
	groupId?: string;
	groupOrder?: number;
	globalCost?: ResourceGlobalCostConfig;
	tierTrack?: ResourceTierTrack;
	/**
	 * When set, declares that this resource represents a bound of another
	 * resource. Used by UI to display "current/max" pairs. Resources with
	 * boundOf should not be displayed independently in the UI.
	 */
	boundOf?: ResourceBoundOfConfig;
}

export interface ResourceGroupParent extends ResourceMetadata, ResourceBounds {
	displayAsPercent?: boolean;
	trackValueBreakdown?: boolean;
	trackBoundBreakdown?: boolean;
	tierTrack?: ResourceTierTrack;
}

export interface ResourceGroupDefinition {
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
	parent?: ResourceGroupParent;
}

/**
 * An item within a ResourceCategory. Can reference either a single resource
 * or a resource group.
 */
export type ResourceCategoryItem =
	| { type: 'resource'; id: string }
	| { type: 'group'; id: string };

/**
 * Defines a UI category that groups resources and resource groups into
 * a single display row. Categories are ordered for consistent rendering.
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
	contents: readonly ResourceCategoryItem[];
}
