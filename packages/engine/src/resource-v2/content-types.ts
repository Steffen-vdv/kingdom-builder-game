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
