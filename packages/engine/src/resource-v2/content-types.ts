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

export interface ContentBounds {
	readonly lowerBound?: number;
	readonly upperBound?: number;
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

/**
 * Specifies which type of bound this resource represents.
 * - 'upper': This resource is the upper bound (max) of another resource.
 * - 'lower': This resource is the lower bound (min) of another resource.
 */
export type ContentBoundType = 'upper' | 'lower';

/**
 * Configuration for a resource that acts as a bound of another resource.
 * The UI will display these together (e.g., "5/10" for current/max).
 */
export interface ContentBoundOfConfig {
	/** The resource ID this resource is a bound of */
	readonly resourceId: string;
	/** Whether this is an upper or lower bound */
	readonly boundType: ContentBoundType;
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
	readonly reconciliation?: string;
	/**
	 * When set, declares that this resource represents a bound of another
	 * resource. Used by UI to display "current/max" pairs. Resources with
	 * boundOf should not be displayed independently in the UI.
	 */
	readonly boundOf?: ContentBoundOfConfig;
}

export interface ContentResourceGroupParent
	extends ContentMetadata, ContentBounds {
	readonly displayAsPercent?: boolean;
	readonly allowDecimal?: boolean;
	readonly trackValueBreakdown?: boolean;
	readonly trackBoundBreakdown?: boolean;
	readonly tierTrack?: ContentTierTrack;
	readonly reconciliation?: string;
}

export interface ContentResourceGroupDefinition {
	readonly id: string;
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
	readonly contents: readonly ContentCategoryItem[];
}
