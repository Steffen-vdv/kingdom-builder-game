import type { EffectDef } from '../effects';

/**
 * Reconciliation modes for resource bounds.
 * - 'clamp': Clamp values to stay within bounds (default behavior)
 * - 'pass': Pass values through without bound checking (allows overflow)
 * - 'reject': Reject changes that would exceed bounds (throws error)
 */
export type SessionResourceReconciliationMode = 'clamp' | 'pass' | 'reject';

/**
 * A reference to another resource whose value acts as this bound.
 * When the referenced resource's value changes, reconciliation is applied.
 */
export interface SessionResourceBoundReference {
	/** The resource ID whose value determines this bound */
	readonly resourceId: string;
	/**
	 * How to reconcile when the bound changes and the current value
	 * would overflow/underflow. Default: 'clamp'
	 */
	readonly reconciliation?: SessionResourceReconciliationMode;
}

/** A bound can be a static number or a dynamic reference to another resource */
export type SessionResourceBoundValue = number | SessionResourceBoundReference;

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
export interface SessionResourceBoundOfConfig {
	/** The resource ID this resource is a bound of */
	resourceId: string;
	/** Whether this is an upper or lower bound */
	boundType: SessionResourceBoundType;
}

export interface SessionResourceTierThreshold {
	min: number | null;
	max: number | null;
}

export interface SessionResourceTierDefinition {
	id: string;
	label: string;
	icon?: string;
	description?: string;
	order: number | null;
	resolvedOrder: number;
	threshold: SessionResourceTierThreshold;
	enterEffects: readonly EffectDef[];
	exitEffects: readonly EffectDef[];
}

export interface SessionResourceTierTrackMetadata {
	id: string;
	label: string;
	icon?: string;
	description?: string;
	order: number | null;
	resolvedOrder: number;
}

export interface SessionResourceTierTrack {
	metadata: SessionResourceTierTrackMetadata;
	tiers: readonly SessionResourceTierDefinition[];
}

export interface SessionResourceMetadata {
	id: string;
	label: string;
	icon: string;
	description: string | null;
	order: number | null;
	resolvedOrder: number;
	tags: readonly string[];
}

export interface SessionResourceBounds {
	lowerBound: SessionResourceBoundValue | null;
	upperBound: SessionResourceBoundValue | null;
}

export interface SessionResourceGlobalCostConfig {
	amount: number;
}

export interface SessionResourceDefinition
	extends SessionResourceMetadata, SessionResourceBounds {
	displayAsPercent: boolean;
	allowDecimal: boolean;
	trackValueBreakdown: boolean;
	trackBoundBreakdown: boolean;
	groupId: string | null;
	groupOrder: number | null;
	resolvedGroupOrder: number | null;
	globalCost?: SessionResourceGlobalCostConfig;
	tierTrack?: SessionResourceTierTrack;
	/**
	 * When set, declares that this resource represents a bound of another
	 * resource. Used by UI to display "current/max" pairs. Resources with
	 * boundOf should not be displayed independently in the UI.
	 */
	boundOf: SessionResourceBoundOfConfig | null;
}

export interface SessionResourceGroupParent
	extends SessionResourceMetadata, SessionResourceBounds {
	displayAsPercent: boolean;
	trackValueBreakdown: boolean;
	trackBoundBreakdown: boolean;
	tierTrack?: SessionResourceTierTrack;
}

export interface SessionResourceGroupDefinition {
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
	order: number | null;
	resolvedOrder: number;
	parent?: SessionResourceGroupParent;
}

export interface SessionResourceRegistry {
	byId: Readonly<Record<string, SessionResourceDefinition>>;
	ordered: readonly SessionResourceDefinition[];
}

export interface SessionResourceGroupRegistry {
	byId: Readonly<Record<string, SessionResourceGroupDefinition>>;
	ordered: readonly SessionResourceGroupDefinition[];
}

/**
 * An item within a ResourceCategory. Can reference either a single resource
 * or a resource group.
 */
export type SessionResourceCategoryItem =
	| { type: 'resource'; id: string }
	| { type: 'group'; id: string };

/**
 * Defines a UI category that groups resources and resource groups into
 * a single display row. Categories are ordered for consistent rendering.
 */
export interface SessionResourceCategoryDefinition {
	id: string;
	label: string;
	icon: string | null;
	description: string | null;
	order: number | null;
	resolvedOrder: number;
	/**
	 * When true, this category contains core resources that are always visible.
	 * Resources in non-primary categories are only shown if their value has
	 * ever been non-zero (tracked via resourceTouched).
	 */
	isPrimary: boolean;
	contents: readonly SessionResourceCategoryItem[];
}

export interface SessionResourceCategoryRegistry {
	byId: Readonly<Record<string, SessionResourceCategoryDefinition>>;
	ordered: readonly SessionResourceCategoryDefinition[];
}

export interface SessionResourceCatalog {
	resources: SessionResourceRegistry;
	groups: SessionResourceGroupRegistry;
	categories: SessionResourceCategoryRegistry;
}
