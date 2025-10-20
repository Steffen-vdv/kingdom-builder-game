import type {
	Registry,
	SerializedRegistry,
	SessionActionCategoryRegistry,
} from '@kingdom-builder/protocol';
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
