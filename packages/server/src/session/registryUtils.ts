import type {
	Registry,
	SerializedRegistry,
	SessionActionCategoryRegistry,
	ResourceV2DefinitionConfig,
	ResourceV2GroupDefinitionConfig,
} from '@kingdom-builder/protocol';
import type { SessionResourceRegistryPayload } from '@kingdom-builder/protocol/session/resourceV2';
import type { ActionCategoryConfig as ContentActionCategoryConfig } from '@kingdom-builder/contents';

export const cloneRegistry = <DefinitionType>(
	registry: Registry<DefinitionType>,
): SerializedRegistry<DefinitionType> => {
	const entries = registry.entries();
	const result: SerializedRegistry<DefinitionType> = {};
	for (const [id, definition] of entries) {
		const clonedDefinition: DefinitionType = structuredClone(definition);
		result[id] = clonedDefinition;
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

const cloneResourceDefinitionRecord = (
	definitions: Record<string, ResourceV2DefinitionConfig>,
): Record<string, ResourceV2DefinitionConfig> => {
	const cloned: Record<string, ResourceV2DefinitionConfig> = {};
	for (const [id, definition] of Object.entries(definitions)) {
		if (!definition) {
			continue;
		}
		const clonedDefinition: ResourceV2DefinitionConfig =
			structuredClone(definition);
		cloned[id] = clonedDefinition;
	}
	return cloned;
};

const cloneResourceGroupRecord = (
	groups: Record<string, ResourceV2GroupDefinitionConfig>,
): Record<string, ResourceV2GroupDefinitionConfig> => {
	const cloned: Record<string, ResourceV2GroupDefinitionConfig> = {};
	for (const [id, definition] of Object.entries(groups)) {
		if (!definition) {
			continue;
		}
		const clonedGroup: ResourceV2GroupDefinitionConfig =
			structuredClone(definition);
		cloned[id] = clonedGroup;
	}
	return cloned;
};

const resolveGlobalActionCost = (
	definitions: Record<string, ResourceV2DefinitionConfig>,
): SessionResourceRegistryPayload['globalActionCost'] => {
	for (const definition of Object.values(definitions)) {
		if (!definition?.globalActionCost) {
			continue;
		}
		const globalCost = definition.globalActionCost;
		if (globalCost) {
			return {
				resourceId: definition.id,
				amount: globalCost.amount,
			};
		}
	}
	return null;
};

export const createResourceRegistryPayload = (
	definitions: Iterable<ResourceV2DefinitionConfig>,
	groups: Iterable<ResourceV2GroupDefinitionConfig>,
): SessionResourceRegistryPayload => {
	const definitionRecord: Record<string, ResourceV2DefinitionConfig> = {};
	for (const definition of definitions) {
		const clonedDefinition: ResourceV2DefinitionConfig =
			structuredClone(definition);
		definitionRecord[definition.id] = clonedDefinition;
	}
	const groupRecord: Record<string, ResourceV2GroupDefinitionConfig> = {};
	for (const group of groups) {
		const clonedGroup: ResourceV2GroupDefinitionConfig = structuredClone(group);
		groupRecord[group.id] = clonedGroup;
	}
	return {
		definitions: definitionRecord,
		groups: groupRecord,
		globalActionCost: resolveGlobalActionCost(definitionRecord),
	} satisfies SessionResourceRegistryPayload;
};

export const cloneResourceRegistryPayload = (
	payload: SessionResourceRegistryPayload,
): SessionResourceRegistryPayload => {
	return {
		definitions: cloneResourceDefinitionRecord(payload.definitions),
		groups: cloneResourceGroupRecord(payload.groups),
		globalActionCost: payload.globalActionCost
			? { ...payload.globalActionCost }
			: null,
	} satisfies SessionResourceRegistryPayload;
};

export const freezeResourceRegistryPayload = (
	payload: SessionResourceRegistryPayload,
): SessionResourceRegistryPayload => {
	for (const key of Object.keys(payload.definitions)) {
		const definition = payload.definitions[key];
		if (definition) {
			Object.freeze(definition);
		}
	}
	Object.freeze(payload.definitions);
	for (const key of Object.keys(payload.groups)) {
		const group = payload.groups[key];
		if (!group) {
			continue;
		}
		if (group.parent) {
			Object.freeze(group.parent);
		}
		Object.freeze(group);
	}
	Object.freeze(payload.groups);
	if (payload.globalActionCost) {
		Object.freeze(payload.globalActionCost);
	}
	return Object.freeze(payload) as SessionResourceRegistryPayload;
};
