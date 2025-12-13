import type { EffectDef } from '@kingdom-builder/protocol';

export interface RuntimeResourceTierThreshold {
	readonly min: number | null;
	readonly max: number | null;
}

export interface RuntimeResourceTierDefinition {
	readonly id: string;
	readonly label: string;
	readonly icon?: string;
	readonly description?: string;
	readonly order: number | null;
	readonly resolvedOrder: number;
	readonly threshold: RuntimeResourceTierThreshold;
	readonly enterEffects: readonly EffectDef[];
	readonly exitEffects: readonly EffectDef[];
}

export interface RuntimeResourceTierTrackMetadata {
	readonly id: string;
	readonly label: string;
	readonly icon?: string;
	readonly description?: string;
	readonly order: number | null;
	readonly resolvedOrder: number;
}

export interface RuntimeResourceTierTrack {
	readonly metadata: RuntimeResourceTierTrackMetadata;
	readonly tiers: readonly RuntimeResourceTierDefinition[];
}

export interface RuntimeResourceMetadata {
	readonly id: string;
	readonly label: string;
	readonly icon: string;
	readonly description: string | null;
	readonly order: number | null;
	readonly resolvedOrder: number;
	readonly tags: readonly string[];
}

/**
 * Reconciliation modes for resource bounds.
 * - 'clamp': Clamp values to stay within bounds (default behavior)
 * - 'pass': Pass values through without bound checking (allows overflow)
 * - 'reject': Reject changes that would exceed bounds (throws error)
 */
export type RuntimeReconciliationMode = 'clamp' | 'pass' | 'reject';

/**
 * A reference to another resource whose value acts as this bound.
 * When the referenced resource's value changes, cascading reconciliation
 * is automatically applied to ensure dependent resources stay within bounds.
 *
 * ## Cascading Reconciliation
 * When a bound resource changes (e.g., max-population decreases from 20 to 10),
 * all resources that reference it as a bound are automatically reconciled:
 * - `clamp`: Value is clamped to the new bound (population: 15 → 10)
 * - `pass`: Value is left unchanged, even if it exceeds the new bound
 * - `reject`: An error is thrown if the value violates the new bound
 *
 * ## Content Maintainer Notes
 *
 * **Avoid circular bound references.** While the engine prevents infinite loops
 * during cascading reconciliation, circular dependencies create initialization
 * problems. For example, if resource A's upper bound references B and B's upper
 * bound references A, both resources initialize to 0 and cannot increase beyond
 * each other's initial value.
 *
 * **Prefer one-way dependency chains.** Good patterns:
 * - `max-population` → `population` (stat bounds currency)
 * - `max-population` → `total-population` → `workforce` (chained bounds)
 *
 * **Avoid:**
 * - `A` ↔ `B` (mutual bounds create deadlock)
 * - `A` → `B` → `C` → `A` (cycles prevent value increases)
 */
export interface RuntimeBoundReference {
	/** The resource ID whose value determines this bound */
	readonly resourceId: string;
	/**
	 * How to reconcile when the bound changes and the current value
	 * would overflow/underflow. Default: 'clamp'
	 */
	readonly reconciliation: RuntimeReconciliationMode;
}

/** A bound can be a static number, null (unbounded), or a dynamic reference */
export type RuntimeBoundValue = number | RuntimeBoundReference | null;

export interface RuntimeResourceBounds {
	readonly lowerBound: RuntimeBoundValue;
	readonly upperBound: RuntimeBoundValue;
}

export interface RuntimeResourceGlobalCostConfig {
	readonly amount: number;
}

/**
 * Triggers that run when a resource value changes.
 */
export interface RuntimeResourceTriggers {
	/**
	 * Effects to run when this resource's value increases.
	 * Runs once per unit of increase.
	 */
	readonly onValueIncrease: readonly EffectDef[];
	/**
	 * Effects to run when this resource's value decreases.
	 * Runs once per unit of decrease.
	 */
	readonly onValueDecrease: readonly EffectDef[];
}

/**
 * Upkeep cost per unit of this resource, paid during the upkeep phase.
 */
export interface RuntimeResourceUpkeepCost {
	readonly resourceId: string;
	readonly amount: number;
}

/**
 * Phase effects that run during specific game phases.
 * These are triggered per-unit of the resource.
 */
export interface RuntimeResourcePhaseEffects {
	readonly onPayUpkeepStep: readonly EffectDef[];
	readonly onGainIncomeStep: readonly EffectDef[];
	readonly onGainAPStep: readonly EffectDef[];
}

export interface RuntimeResourceDefinition
	extends
		RuntimeResourceMetadata,
		RuntimeResourceBounds,
		RuntimeResourceTriggers,
		RuntimeResourcePhaseEffects {
	readonly displayAsPercent: boolean;
	readonly allowDecimal: boolean;
	readonly trackValueBreakdown: boolean;
	readonly trackBoundBreakdown: boolean;
	readonly groupId: string | null;
	readonly groupOrder: number | null;
	readonly resolvedGroupOrder: number | null;
	readonly globalCost?: RuntimeResourceGlobalCostConfig;
	readonly tierTrack?: RuntimeResourceTierTrack;
	readonly upkeep?: RuntimeResourceUpkeepCost;
}

export interface RuntimeResourceGroupParent
	extends RuntimeResourceMetadata, RuntimeResourceBounds {
	readonly displayAsPercent: boolean;
	readonly allowDecimal: boolean;
	readonly trackValueBreakdown: boolean;
	readonly trackBoundBreakdown: boolean;
	readonly tierTrack?: RuntimeResourceTierTrack;
}

export interface RuntimeResourceGroup {
	readonly id: string;
	/**
	 * Display label for the group in the resource bar.
	 * Falls back to parent.label if not set.
	 */
	readonly label?: string;
	/**
	 * Display icon for the group in the resource bar.
	 * Falls back to parent.icon if not set.
	 */
	readonly icon?: string;
	readonly order: number | null;
	readonly resolvedOrder: number;
	readonly parent?: RuntimeResourceGroupParent;
}

export interface RuntimeResourceRegistry {
	readonly byId: Readonly<Record<string, RuntimeResourceDefinition>>;
	readonly ordered: readonly RuntimeResourceDefinition[];
}

export interface RuntimeResourceGroupRegistry {
	readonly byId: Readonly<Record<string, RuntimeResourceGroup>>;
	readonly ordered: readonly RuntimeResourceGroup[];
}

/**
 * An item within a ResourceCategory. Can reference either a single resource
 * or a resource group.
 */
export type RuntimeResourceCategoryItem =
	| { type: 'resource'; id: string }
	| { type: 'group'; id: string };

/**
 * Defines a UI category that groups resources and resource groups into
 * a single display row. Categories are ordered for consistent rendering.
 */
export interface RuntimeResourceCategoryDefinition {
	readonly id: string;
	readonly label: string;
	readonly icon: string | null;
	readonly description: string | null;
	readonly order: number | null;
	readonly resolvedOrder: number;
	/**
	 * When true, this category contains core resources that are always visible.
	 * Resources in non-primary categories are only shown if their value has
	 * ever been non-zero (tracked via resourceTouched).
	 */
	readonly isPrimary: boolean;
	readonly contents: readonly RuntimeResourceCategoryItem[];
}

export interface RuntimeResourceCategoryRegistry {
	readonly byId: Readonly<Record<string, RuntimeResourceCategoryDefinition>>;
	readonly ordered: readonly RuntimeResourceCategoryDefinition[];
}

export interface RuntimeResourceCatalog {
	readonly resources: RuntimeResourceRegistry;
	readonly groups: RuntimeResourceGroupRegistry;
	readonly categories: RuntimeResourceCategoryRegistry;
}
