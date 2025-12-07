import type { EffectDef } from '../effects';

/**
 * Reconciliation modes for resource bounds.
 * - 'clamp': Clamp values to stay within bounds (default behavior)
 * - 'pass': Pass values through without bound checking (allows overflow)
 * - 'reject': Reject changes that would exceed bounds (throws error)
 */
export type SessionResourceReconciliationModeV2 = 'clamp' | 'pass' | 'reject';

/**
 * A reference to another resource whose value acts as this bound.
 * When the referenced resource's value changes, reconciliation is applied.
 */
export interface SessionResourceBoundReferenceV2 {
	/** The resource ID whose value determines this bound */
	readonly resourceId: string;
	/**
	 * How to reconcile when the bound changes and the current value
	 * would overflow/underflow. Default: 'clamp'
	 */
	readonly reconciliation?: SessionResourceReconciliationModeV2;
}

/** A bound can be a static number or a dynamic reference to another resource */
export type SessionResourceBoundValueV2 =
	| number
	| SessionResourceBoundReferenceV2;

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
	lowerBound: SessionResourceBoundValueV2 | null;
	upperBound: SessionResourceBoundValueV2 | null;
}

export interface SessionResourceGlobalCostConfigV2 {
	amount: number;
}

export interface SessionResourceDefinitionV2
	extends SessionResourceMetadataV2, SessionResourceBoundsV2 {
	displayAsPercent: boolean;
	allowDecimal: boolean;
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
	/**
	 * When true, this category contains core resources that are always visible.
	 * Resources in non-primary categories are only shown if their value has
	 * ever been non-zero (tracked via resourceTouched).
	 */
	isPrimary: boolean;
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
