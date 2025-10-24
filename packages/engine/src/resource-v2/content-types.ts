import type { EffectDef } from '@kingdom-builder/protocol';

export interface ContentOrderedRegistry<T extends { id: string }> {
	readonly byId: Readonly<Record<string, T>>;
	readonly ordered: readonly T[];
}

export interface ContentTierThreshold {
	readonly min?: number | undefined;
	readonly max?: number | undefined;
}

export interface ContentTierDefinition {
	readonly id: string;
	readonly label: string;
	readonly icon?: string | undefined;
	readonly description?: string | undefined;
	readonly order?: number | undefined;
	readonly threshold: ContentTierThreshold;
	readonly enterEffects?: readonly EffectDef[] | undefined;
	readonly exitEffects?: readonly EffectDef[] | undefined;
}

export interface ContentTierTrackMetadata {
	readonly id: string;
	readonly label: string;
	readonly icon?: string | undefined;
	readonly description?: string | undefined;
	readonly order?: number | undefined;
}

export interface ContentTierTrack {
	readonly metadata: ContentTierTrackMetadata;
	readonly tiers: readonly ContentTierDefinition[];
}

export interface ContentBounds {
	readonly lowerBound?: number | undefined;
	readonly upperBound?: number | undefined;
}

export interface ContentMetadata {
	readonly id: string;
	readonly label: string;
	readonly icon: string;
	readonly description?: string | undefined;
	readonly order?: number | undefined;
	readonly tags?: readonly string[] | undefined;
}

export interface ContentResourceDefinition
	extends ContentMetadata,
		ContentBounds {
	readonly displayAsPercent?: boolean | undefined;
	readonly trackValueBreakdown?: boolean | undefined;
	readonly trackBoundBreakdown?: boolean | undefined;
	readonly groupId?: string | undefined;
	readonly groupOrder?: number | undefined;
	readonly globalCost?: { amount: number } | undefined;
	readonly tierTrack?: ContentTierTrack | undefined;
	readonly reconciliation?: string | undefined;
}

export interface ContentResourceGroupParent
	extends ContentMetadata,
		ContentBounds {
	readonly displayAsPercent?: boolean | undefined;
	readonly trackValueBreakdown?: boolean | undefined;
	readonly trackBoundBreakdown?: boolean | undefined;
	readonly tierTrack?: ContentTierTrack | undefined;
	readonly reconciliation?: string | undefined;
}

export interface ContentResourceGroupDefinition {
	readonly id: string;
	readonly order?: number | undefined;
	readonly parent?: ContentResourceGroupParent | undefined;
}
