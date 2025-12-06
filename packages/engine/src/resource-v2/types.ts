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

export interface RuntimeResourceBounds {
	readonly lowerBound: number | null;
	readonly upperBound: number | null;
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
 * Specifies which type of bound this resource represents.
 * - 'upper': This resource is the upper bound (max) of another resource.
 * - 'lower': This resource is the lower bound (min) of another resource.
 */
export type RuntimeResourceBoundType = 'upper' | 'lower';

/**
 * Configuration for a resource that acts as a bound of another resource.
 * The UI will display these together (e.g., "5/10" for current/max).
 */
export interface RuntimeResourceBoundOfConfig {
	/** The resource ID this resource is a bound of */
	readonly resourceId: string;
	/** Whether this is an upper or lower bound */
	readonly boundType: RuntimeResourceBoundType;
}

export interface RuntimeResourceDefinition
	extends
		RuntimeResourceMetadata,
		RuntimeResourceBounds,
		RuntimeResourceTriggers {
	readonly displayAsPercent: boolean;
	readonly allowDecimal: boolean;
	readonly trackValueBreakdown: boolean;
	readonly trackBoundBreakdown: boolean;
	readonly groupId: string | null;
	readonly groupOrder: number | null;
	readonly resolvedGroupOrder: number | null;
	readonly globalCost?: RuntimeResourceGlobalCostConfig;
	readonly tierTrack?: RuntimeResourceTierTrack;
	/**
	 * When set, declares that this resource represents a bound of another
	 * resource. Used by UI to display "current/max" pairs. Resources with
	 * boundOf should not be displayed independently in the UI.
	 */
	readonly boundOf: RuntimeResourceBoundOfConfig | null;
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
