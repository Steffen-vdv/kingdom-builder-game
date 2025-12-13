import type { EffectDef } from '@kingdom-builder/protocol';
import type { ResourceReconciliationMode } from './reconciliation';

export interface ResourceMetadata {
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
 * Upkeep cost for a resource. Paid during the upkeep phase.
 * Each unit of this resource costs the specified amount.
 */
export interface ResourceUpkeepCost {
	resourceId: string;
	amount: number;
}

/**
 * Phase effects that run during specific game phases.
 * These are triggered per-unit of the resource.
 */
export interface ResourcePhaseEffects {
	/** Effects to run during the Pay Upkeep step */
	onPayUpkeepStep?: readonly EffectDef[];
	/** Effects to run during the Gain Income step */
	onGainIncomeStep?: readonly EffectDef[];
	/** Effects to run during the Gain AP step */
	onGainAPStep?: readonly EffectDef[];
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

export interface ResourceDefinition extends ResourceMetadata, ResourceBounds, ResourceTriggers, ResourcePhaseEffects {
	displayAsPercent?: boolean;
	allowDecimal?: boolean;
	trackValueBreakdown?: boolean;
	trackBoundBreakdown?: boolean;
	groupId?: string;
	groupOrder?: number;
	globalCost?: ResourceGlobalCostConfig;
	tierTrack?: ResourceTierTrack;
	/**
	 * Declares that this resource represents a bound of another resource.
	 * Used for UI display (e.g., showing "5/10" for current/max).
	 * Resources with boundOf should not be displayed independently in the UI.
	 */
	boundOf?: ResourceBoundOfConfig;
	/**
	 * Upkeep cost per unit of this resource, paid during the upkeep phase.
	 */
	upkeep?: ResourceUpkeepCost;
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
 * When the referenced resource's value changes, cascading reconciliation is
 * automatically applied to ensure this resource stays within its new bounds.
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
 *
 * **WARNING: Avoid circular bound references.** If resource A's bound
 * references B and B's bound references A, both will initialize to 0 and
 * cannot increase. Prefer one-way dependency chains like:
 * `max-population → population → workforce`
 */
export function boundTo(resourceId: string, reconciliation?: ResourceReconciliationMode): ResourceBoundReference {
	return reconciliation ? { resourceId, reconciliation } : { resourceId };
}
