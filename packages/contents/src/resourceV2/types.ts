import type { EffectDef } from '@kingdom-builder/protocol';
import type { ResourceReconciliationMode } from './reconciliation';

export interface ResourceV2Metadata {
	id: string;
	label: string;
	icon: string;
	description?: string;
	order?: number;
	tags?: readonly string[];
}

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

export interface ResourceV2Bounds {
	lowerBound?: ResourceBoundValue;
	upperBound?: ResourceBoundValue;
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

/**
 * Creates a dynamic bound reference to another resource's value.
 * Use this helper when configuring resource bounds to improve readability.
 *
 * @param resourceId - The resource whose value acts as this bound
 * @param reconciliation - How to handle overflow/underflow when bound changes
 *                         (default: 'clamp')
 *
 * @example
 * // Default clamp behavior - population capped by max-population
 * .upperBound(boundTo(Stat.populationMax))
 *
 * // Explicit reconciliation mode
 * .upperBound(boundTo(Stat.populationMax, ReconciliationMode.REJECT))
 */
export function boundTo(resourceId: string, reconciliation?: ResourceReconciliationMode): ResourceBoundReference {
	return reconciliation ? { resourceId, reconciliation } : { resourceId };
}
