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

export interface RuntimeResourceDefinition
	extends RuntimeResourceMetadata,
		RuntimeResourceBounds {
	readonly displayAsPercent: boolean;
	readonly trackValueBreakdown: boolean;
	readonly trackBoundBreakdown: boolean;
	readonly groupId: string | null;
	readonly groupOrder: number | null;
	readonly resolvedGroupOrder: number | null;
	readonly globalCost?: RuntimeResourceGlobalCostConfig;
	readonly tierTrack?: RuntimeResourceTierTrack;
}

export interface RuntimeResourceGroupParent
	extends RuntimeResourceMetadata,
		RuntimeResourceBounds {
	readonly displayAsPercent: boolean;
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

export interface RuntimeResourceCatalog {
	readonly resources: RuntimeResourceRegistry;
	readonly groups: RuntimeResourceGroupRegistry;
}
