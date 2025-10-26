import type { RuntimeResourceContent } from '@kingdom-builder/engine';
import type {
	ResourceV2Definition,
	ResourceV2GroupDefinition,
	ResourceV2GroupParent,
	ResourceV2TierDefinition,
	ResourceV2TierThreshold,
	ResourceV2TierTrack,
} from '@kingdom-builder/protocol/resource-v2';
import type {
	EffectDef,
	SerializedRegistry,
	ResourceV2CatalogSnapshot,
} from '@kingdom-builder/protocol';
import { freezeSerializedRegistry } from './registryUtils.js';

type TierDefinitionLike = {
	id: string;
	label: string;
	icon?: string;
	description?: string | null;
	order?: number | null;
	threshold?: { min?: number | null; max?: number | null };
	enterEffects?: readonly EffectDef[];
	exitEffects?: readonly EffectDef[];
};

type TierTrackLike = {
	metadata: {
		id: string;
		label: string;
		icon?: string;
		description?: string | null;
		order?: number | null;
	};
	tiers: readonly TierDefinitionLike[];
};

type ResourceDefinitionLike = {
	id: string;
	label: string;
	icon: string;
	description?: string | null;
	order?: number | null;
	tags?: readonly string[];
	lowerBound?: number | null;
	upperBound?: number | null;
	displayAsPercent?: boolean;
	trackValueBreakdown?: boolean;
	trackBoundBreakdown?: boolean;
	groupId?: string | null;
	groupOrder?: number | null;
	globalCost?: { amount: number };
	tierTrack?: TierTrackLike;
};

type ResourceGroupParentLike = ResourceDefinitionLike;

type ResourceGroupLike = {
	id: string;
	order?: number | null;
	parent?: ResourceGroupParentLike;
};

type ResourceCatalogLike = {
	resources: {
		byId: Readonly<Record<string, ResourceDefinitionLike>>;
	};
	groups: {
		byId: Readonly<Record<string, ResourceGroupLike>>;
	};
};

function toOptionalNumber(
	value: number | null | undefined,
): number | undefined {
	return value ?? undefined;
}

function toOptionalString(
	value: string | null | undefined,
): string | undefined {
	return value ?? undefined;
}

function convertTierTrack(
	track: TierTrackLike | undefined,
): ResourceV2TierTrack | undefined {
	if (!track) {
		return undefined;
	}
	const metadata = track.metadata;
	const serialized: ResourceV2TierTrack = {
		metadata: {
			id: metadata.id,
			label: metadata.label,
		},
		tiers: track.tiers.map((tier) => {
			const threshold: ResourceV2TierThreshold = {};
			if (tier.threshold?.min !== undefined && tier.threshold?.min !== null) {
				threshold.min = tier.threshold.min;
			}
			if (tier.threshold?.max !== undefined && tier.threshold?.max !== null) {
				threshold.max = tier.threshold.max;
			}
			const tierEntry: ResourceV2TierDefinition = {
				id: tier.id,
				label: tier.label,
				threshold,
			};
			if (tier.icon !== undefined) {
				tierEntry.icon = tier.icon;
			}
			if (tier.description != null) {
				tierEntry.description = tier.description;
			}
			if (typeof tier.order === 'number') {
				tierEntry.order = tier.order;
			}
			if (tier.enterEffects && tier.enterEffects.length) {
				tierEntry.enterEffects = [...tier.enterEffects];
			}
			if (tier.exitEffects && tier.exitEffects.length) {
				tierEntry.exitEffects = [...tier.exitEffects];
			}
			return tierEntry;
		}),
	};
	if (metadata.icon !== undefined) {
		serialized.metadata.icon = metadata.icon;
	}
	if (metadata.description != null) {
		serialized.metadata.description = metadata.description;
	}
	if (typeof metadata.order === 'number') {
		serialized.metadata.order = metadata.order;
	}
	return serialized;
}

function convertResourceDefinition(
	definition: ResourceDefinitionLike,
): ResourceV2Definition {
	const entry: ResourceV2Definition = {
		id: definition.id,
		label: definition.label,
		icon: definition.icon,
	};
	const description = toOptionalString(definition.description);
	if (description !== undefined) {
		entry.description = description;
	}
	if (typeof definition.order === 'number') {
		entry.order = definition.order;
	}
	if (definition.tags && definition.tags.length > 0) {
		entry.tags = [...definition.tags];
	}
	const lower = toOptionalNumber(definition.lowerBound);
	if (lower !== undefined) {
		entry.lowerBound = lower;
	}
	const upper = toOptionalNumber(definition.upperBound);
	if (upper !== undefined) {
		entry.upperBound = upper;
	}
	if (definition.displayAsPercent === true) {
		entry.displayAsPercent = true;
	}
	if (definition.trackValueBreakdown === true) {
		entry.trackValueBreakdown = true;
	}
	if (definition.trackBoundBreakdown === true) {
		entry.trackBoundBreakdown = true;
	}
	const groupId = toOptionalString(definition.groupId);
	if (groupId !== undefined) {
		entry.groupId = groupId;
	}
	const groupOrder = toOptionalNumber(definition.groupOrder);
	if (groupOrder !== undefined) {
		entry.groupOrder = groupOrder;
	}
	if (definition.globalCost) {
		entry.globalCost = { amount: definition.globalCost.amount };
	}
	const tierTrack = convertTierTrack(definition.tierTrack);
	if (tierTrack) {
		entry.tierTrack = tierTrack;
	}
	return entry;
}

function convertGroupParent(
	parent: ResourceGroupParentLike,
): ResourceV2GroupParent {
	const entry: ResourceV2GroupParent = {
		id: parent.id,
		label: parent.label,
		icon: parent.icon,
	};
	if (parent.description != null) {
		entry.description = parent.description;
	}
	if (typeof parent.order === 'number') {
		entry.order = parent.order;
	}
	if (parent.tags && parent.tags.length > 0) {
		entry.tags = [...parent.tags];
	}
	const lower = toOptionalNumber(parent.lowerBound);
	if (lower !== undefined) {
		entry.lowerBound = lower;
	}
	const upper = toOptionalNumber(parent.upperBound);
	if (upper !== undefined) {
		entry.upperBound = upper;
	}
	if (parent.displayAsPercent === true) {
		entry.displayAsPercent = true;
	}
	if (parent.trackValueBreakdown === true) {
		entry.trackValueBreakdown = true;
	}
	if (parent.trackBoundBreakdown === true) {
		entry.trackBoundBreakdown = true;
	}
	const tierTrack = convertTierTrack(parent.tierTrack);
	if (tierTrack) {
		entry.tierTrack = tierTrack;
	}
	return entry;
}

function convertGroupDefinition(
	group: ResourceGroupLike,
): ResourceV2GroupDefinition {
	const entry: ResourceV2GroupDefinition = {
		id: group.id,
	};
	if (typeof group.order === 'number') {
		entry.order = group.order;
	}
	if (group.parent) {
		entry.parent = convertGroupParent(group.parent);
	}
	return entry;
}

export function buildResourceV2Registries(
	catalog: RuntimeResourceContent | ResourceV2CatalogSnapshot,
): {
	resourcesV2: SerializedRegistry<ResourceV2Definition>;
	resourceGroupsV2: SerializedRegistry<ResourceV2GroupDefinition>;
} {
	const snapshot = catalog as unknown as ResourceCatalogLike;
	const resources: SerializedRegistry<ResourceV2Definition> = {};
	for (const definition of Object.values(snapshot.resources.byId)) {
		resources[definition.id] = convertResourceDefinition(definition);
	}
	const resourceGroups: SerializedRegistry<ResourceV2GroupDefinition> = {};
	for (const group of Object.values(snapshot.groups.byId)) {
		resourceGroups[group.id] = convertGroupDefinition(group);
	}
	return {
		resourcesV2: freezeSerializedRegistry(structuredClone(resources)),
		resourceGroupsV2: freezeSerializedRegistry(structuredClone(resourceGroups)),
	};
}
