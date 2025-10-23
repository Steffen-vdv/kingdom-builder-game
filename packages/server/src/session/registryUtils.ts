import type {
	Registry,
	SerializedRegistry,
	SessionActionCategoryRegistry,
} from '@kingdom-builder/protocol';
import type {
	ResourceV2Definition,
	ResourceV2GroupMetadata,
	ResourceV2TierTrack,
	ResourceV2GroupParent,
} from '@kingdom-builder/protocol/config/resourceV2';
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

const cloneMetadataRecord = <Value extends Record<string, unknown> | undefined>(
	metadata: Value,
): Value => {
	if (!metadata) {
		return metadata;
	}
	return structuredClone(metadata);
};

const cloneTierTrack = (tierTrack: ResourceV2TierTrack | undefined) => {
	if (!tierTrack) {
		return tierTrack;
	}
	const clone = structuredClone(tierTrack);
	clone.tiers = clone.tiers.map((tier) => structuredClone(tier));
	return clone;
};

const cloneResourceV2Definition = (
	definition: ResourceV2Definition,
): ResourceV2Definition => {
	const clone = structuredClone(definition);
	clone.metadata = cloneMetadataRecord(clone.metadata);
	clone.tierTrack = cloneTierTrack(clone.tierTrack);
	return clone;
};

const cloneResourceV2GroupParent = (
	parent: ResourceV2GroupParent | undefined,
): ResourceV2GroupParent | undefined => {
	if (!parent) {
		return parent;
	}
	const clone = structuredClone(parent);
	clone.metadata = cloneMetadataRecord(clone.metadata);
	clone.tierTrack = cloneTierTrack(clone.tierTrack);
	return clone;
};

const byOrder = <Definition extends { order: number }>(
	left: Definition,
	right: Definition,
) => left.order - right.order;

export const cloneResourceV2Registry = (
	registry: Record<string, ResourceV2Definition>,
): SerializedRegistry<ResourceV2Definition> => {
	const entries = Object.entries(registry);
	const result: SerializedRegistry<ResourceV2Definition> = {};
	entries
		.map(
			([id, definition]) =>
				[id, cloneResourceV2Definition(definition)] as const,
		)
		.sort(([, left], [, right]) => byOrder(left, right))
		.forEach(([id, definition]) => {
			result[id] = definition;
		});
	return result;
};

export const cloneResourceV2GroupRegistry = (
	registry: Record<string, ResourceV2GroupMetadata>,
): SerializedRegistry<ResourceV2GroupMetadata> | undefined => {
	const entries = Object.entries(registry);
	if (entries.length === 0) {
		return undefined;
	}
	const result: SerializedRegistry<ResourceV2GroupMetadata> = {};
	entries
		.map(([id, definition]) => {
			const clone: ResourceV2GroupMetadata = structuredClone(definition);
			clone.metadata = cloneMetadataRecord(clone.metadata);
			clone.parent = cloneResourceV2GroupParent(definition.parent);
			return [id, clone] as const;
		})
		.sort(([, left], [, right]) => byOrder(left, right))
		.forEach(([id, definition]) => {
			result[id] = definition;
		});
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
