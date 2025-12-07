import type { EffectDef } from '@kingdom-builder/protocol';

export interface ContentOrderedRegistry<T extends { id: string }> {
	readonly byId: Readonly<Record<string, T>>;
	readonly ordered: readonly T[];
}

export interface ContentTierThreshold {
	readonly min?: number;
	readonly max?: number;
}

export interface ContentTierDefinition {
	readonly id: string;
	readonly label: string;
	readonly icon?: string;
	readonly description?: string;
	readonly order?: number;
	readonly threshold: ContentTierThreshold;
	readonly enterEffects?: readonly EffectDef[];
	readonly exitEffects?: readonly EffectDef[];
}

export interface ContentTierTrackMetadata {
	readonly id: string;
	readonly label: string;
	readonly icon?: string;
	readonly description?: string;
	readonly order?: number;
}

export interface ContentTierTrack {
	readonly metadata: ContentTierTrackMetadata;
	readonly tiers: readonly ContentTierDefinition[];
}

/**
 * Reconciliation modes for resource bounds.
 * - 'clamp': Clamp values to stay within bounds (default behavior)
 * - 'pass': Pass values through without bound checking (allows overflow)
 * - 'reject': Reject changes that would exceed bounds (throws error)
 */
export type ContentReconciliationMode = 'clamp' | 'pass' | 'reject';

/**
 * A reference to another resource whose value acts as this bound.
 * When the referenced resource's value changes, reconciliation is applied.
 */
export interface ContentBoundReference {
	/** The resource ID whose value determines this bound */
	readonly resourceId: string;
	/**
	 * How to reconcile when the bound changes and the current value
	 * would overflow/underflow. Default: 'clamp'
	 */
	readonly reconciliation?: ContentReconciliationMode;
}

/** A bound can be a static number or a dynamic reference to another resource */
export type ContentBoundValue = number | ContentBoundReference;

export interface ContentBounds {
	readonly lowerBound?: ContentBoundValue;
	readonly upperBound?: ContentBoundValue;
}

export interface ContentMetadata {
	readonly id: string;
	readonly label: string;
	readonly icon: string;
	readonly description?: string;
	readonly order?: number;
	readonly tags?: readonly string[];
}

/**
 * Triggers that run when a resource value changes.
 */
export interface ContentResourceTriggers {
	readonly onValueIncrease?: readonly EffectDef[];
	readonly onValueDecrease?: readonly EffectDef[];
}

export interface ContentResourceDefinition
	extends ContentMetadata, ContentBounds, ContentResourceTriggers {
	readonly displayAsPercent?: boolean;
	readonly allowDecimal?: boolean;
	readonly trackValueBreakdown?: boolean;
	readonly trackBoundBreakdown?: boolean;
	readonly groupId?: string;
	readonly groupOrder?: number;
	readonly globalCost?: { amount: number };
	readonly tierTrack?: ContentTierTrack;
}

export interface ContentResourceGroupParent
	extends ContentMetadata, ContentBounds {
	readonly displayAsPercent?: boolean;
	readonly allowDecimal?: boolean;
	readonly trackValueBreakdown?: boolean;
	readonly trackBoundBreakdown?: boolean;
	readonly tierTrack?: ContentTierTrack;
}

export interface ContentResourceGroupDefinition {
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
	readonly order?: number;
	readonly parent?: ContentResourceGroupParent;
}

/**
 * An item within a ResourceCategory. Can reference either a single resource
 * or a resource group.
 */
export type ContentCategoryItem =
	| { type: 'resource'; id: string }
	| { type: 'group'; id: string };

/**
 * Defines a UI category that groups resources and resource groups into
 * a single display row. Categories are ordered for consistent rendering.
 */
export interface ContentCategoryDefinition {
	readonly id: string;
	readonly label: string;
	readonly icon?: string;
	readonly description?: string;
	readonly order?: number;
	/**
	 * When true, this category contains core resources that are always visible.
	 * Resources in non-primary categories are only shown if their value has
	 * ever been non-zero (tracked via resourceTouched).
	 */
	readonly isPrimary?: boolean;
	readonly contents: readonly ContentCategoryItem[];
}
