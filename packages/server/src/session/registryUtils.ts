import type {
	Registry,
	SerializedRegistry,
	SessionActionCategoryRegistry,
	ResourceV2Definition,
	ResourceV2GroupDefinition,
	ResourceV2TierDefinition,
	ResourceV2TierTrack,
} from '@kingdom-builder/protocol';
import {
	createRuntimeResourceCatalog,
	type RuntimeResourceCatalog,
	type RuntimeResourceContent,
	type RuntimeResourceDefinition,
	type RuntimeResourceGroup,
	type RuntimeResourceGroupParent,
	type RuntimeResourceTierDefinition,
	type RuntimeResourceTierTrack,
} from '@kingdom-builder/engine/resource-v2';
import type { ActionCategoryConfig as ContentActionCategoryConfig } from '@kingdom-builder/contents';

export const cloneRegistry = <DefinitionType>(
	registry: Registry<DefinitionType>,
): SerializedRegistry<DefinitionType> => {
	const entries = registry.entries();
	const result: SerializedRegistry<DefinitionType> = {};
	for (const [id, definition] of entries) {
		result[id] = structuredClone(definition);
	}
	return result;
};

export const cloneActionCategoryRegistry = (
	registry: Registry<ContentActionCategoryConfig>,
): SessionActionCategoryRegistry => {
	const entries: SessionActionCategoryRegistry = {};
	for (const [id, definition] of registry.entries()) {
		const entry: SessionActionCategoryRegistry[string] = {
			id: definition.id,
			title: definition.label,
			subtitle: definition.subtitle ?? definition.label,
			icon: definition.icon,
			order: definition.order,
			layout: definition.layout,
		};
		if (definition.description) {
			entry.description = definition.description;
		}
		if (definition.hideWhenEmpty) {
			entry.hideWhenEmpty = definition.hideWhenEmpty;
		}
		if (definition.analyticsKey) {
			entry.analyticsKey = definition.analyticsKey;
		}
		entries[id] = entry;
	}
	return entries;
};

export const freezeSerializedRegistry = <DefinitionType>(
	registry: SerializedRegistry<DefinitionType>,
): SerializedRegistry<DefinitionType> => {
	for (const definition of Object.values(registry)) {
		if (definition && typeof definition === 'object') {
			Object.freeze(definition);
		}
	}
	return Object.freeze(registry) as SerializedRegistry<DefinitionType>;
};

const cloneTierThreshold = (
	threshold: RuntimeResourceTierDefinition['threshold'],
) => {
	const result: ResourceV2TierDefinition['threshold'] = {};
	if (threshold.min !== null) {
		result.min = threshold.min;
	}
	if (threshold.max !== null) {
		result.max = threshold.max;
	}
	return result;
};

const cloneTierDefinition = (
	tier: RuntimeResourceTierDefinition,
): ResourceV2TierDefinition => {
	const result: ResourceV2TierDefinition = {
		id: tier.id,
		label: tier.label,
		threshold: cloneTierThreshold(tier.threshold),
	};
	if (tier.icon) {
		result.icon = tier.icon;
	}
	if (tier.description !== null && tier.description !== undefined) {
		result.description = tier.description;
	}
	if (tier.order !== null) {
		result.order = tier.order;
	}
	if (tier.enterEffects.length > 0) {
		result.enterEffects = [...tier.enterEffects];
	}
	if (tier.exitEffects.length > 0) {
		result.exitEffects = [...tier.exitEffects];
	}
	return result;
};

const cloneTierMetadata = (metadata: RuntimeResourceTierTrack['metadata']) => {
	const result: ResourceV2TierTrack['metadata'] = {
		id: metadata.id,
		label: metadata.label,
	};
	if (metadata.icon) {
		result.icon = metadata.icon;
	}
	if (metadata.description !== null && metadata.description !== undefined) {
		result.description = metadata.description;
	}
	if (metadata.order !== null) {
		result.order = metadata.order;
	}
	return result;
};

const cloneTierTrack = (
	tierTrack: RuntimeResourceTierTrack | undefined,
): ResourceV2TierTrack | undefined => {
	if (!tierTrack) {
		return undefined;
	}
	return {
		metadata: cloneTierMetadata(tierTrack.metadata),
		tiers: tierTrack.tiers.map(cloneTierDefinition),
	};
};

const cloneTags = (tags: readonly string[] | undefined) =>
	tags && tags.length > 0 ? [...tags] : undefined;

const cloneResourceBounds = (
	definition: RuntimeResourceDefinition | RuntimeResourceGroupParent,
) => {
	const bounds: Pick<ResourceV2Definition, 'lowerBound' | 'upperBound'> = {};
	if (definition.lowerBound !== null) {
		bounds.lowerBound = definition.lowerBound;
	}
	if (definition.upperBound !== null) {
		bounds.upperBound = definition.upperBound;
	}
	return bounds;
};

const cloneResourceMetadata = (
	definition: RuntimeResourceDefinition | RuntimeResourceGroupParent,
) => {
	const metadata: Pick<
		ResourceV2Definition,
		'label' | 'icon' | 'description' | 'order'
	> & {
		id: string;
		tags?: readonly string[];
	} = {
		id: definition.id,
		label: definition.label,
		icon: definition.icon,
	};
	if (definition.description !== null && definition.description !== undefined) {
		metadata.description = definition.description;
	}
	if (definition.order !== null && definition.order !== undefined) {
		metadata.order = definition.order;
	}
	const tags = cloneTags(definition.tags);
	if (tags) {
		metadata.tags = tags;
	}
	return metadata;
};

const cloneResourceDefinition = (
	definition: RuntimeResourceDefinition,
): ResourceV2Definition => {
	const base: ResourceV2Definition = {
		...cloneResourceMetadata(definition),
		...cloneResourceBounds(definition),
		displayAsPercent: definition.displayAsPercent,
		trackValueBreakdown: definition.trackValueBreakdown,
		trackBoundBreakdown: definition.trackBoundBreakdown,
	};
	if (definition.groupId !== null) {
		base.groupId = definition.groupId;
	}
	if (definition.groupOrder !== null) {
		base.groupOrder = definition.groupOrder;
	}
	if (definition.globalCost) {
		base.globalCost = { amount: definition.globalCost.amount };
	}
	const tierTrack = cloneTierTrack(definition.tierTrack);
	if (tierTrack) {
		base.tierTrack = tierTrack;
	}
	return base;
};

const cloneGroupParent = (parent: RuntimeResourceGroupParent | undefined) => {
	if (!parent) {
		return undefined;
	}
	const definition: NonNullable<ResourceV2GroupDefinition['parent']> = {
		...cloneResourceMetadata(parent),
		...cloneResourceBounds(parent),
		displayAsPercent: parent.displayAsPercent,
		trackValueBreakdown: parent.trackValueBreakdown,
		trackBoundBreakdown: parent.trackBoundBreakdown,
	};
	const tierTrack = cloneTierTrack(parent.tierTrack);
	if (tierTrack) {
		definition.tierTrack = tierTrack;
	}
	return definition;
};

const cloneResourceGroupDefinition = (
	group: RuntimeResourceGroup,
): ResourceV2GroupDefinition => {
	const definition: ResourceV2GroupDefinition = { id: group.id };
	if (group.order !== null) {
		definition.order = group.order;
	}
	const parent = cloneGroupParent(group.parent);
	if (parent) {
		definition.parent = parent;
	}
	return definition;
};

export const cloneResourceV2Registry = (
	registry: Readonly<Record<string, RuntimeResourceDefinition>>,
): SerializedRegistry<ResourceV2Definition> => {
	const result: SerializedRegistry<ResourceV2Definition> = {};
	for (const [id, definition] of Object.entries(registry)) {
		result[id] = cloneResourceDefinition(definition);
	}
	return result;
};

export const cloneResourceV2GroupRegistry = (
	registry: Readonly<Record<string, RuntimeResourceGroup>>,
): SerializedRegistry<ResourceV2GroupDefinition> => {
	const result: SerializedRegistry<ResourceV2GroupDefinition> = {};
	for (const [id, definition] of Object.entries(registry)) {
		result[id] = cloneResourceGroupDefinition(definition);
	}
	return result;
};

export const cloneResourceCatalogV2 = (
	catalog: RuntimeResourceCatalog,
): {
	resources: SerializedRegistry<ResourceV2Definition>;
	groups: SerializedRegistry<ResourceV2GroupDefinition>;
} => ({
	resources: cloneResourceV2Registry(catalog.resources.byId),
	groups: cloneResourceV2GroupRegistry(catalog.groups.byId),
});

export const snapshotResourceCatalogFromContent = (
	content: RuntimeResourceContent,
) => cloneResourceCatalogV2(createRuntimeResourceCatalog(content));
