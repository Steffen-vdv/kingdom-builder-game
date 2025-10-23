import type {
        Registry,
        SerializedRegistry,
        SessionActionCategoryRegistry,
        SessionResourceRegistryPayload,
        ResourceV2DefinitionConfig,
        ResourceV2GroupDefinitionConfig,
        SessionResourceGlobalCostReference,
} from '@kingdom-builder/protocol';
import type { ActionCategoryConfig as ContentActionCategoryConfig } from '@kingdom-builder/contents';

const typedStructuredClone = <Value>(value: Value): Value => {
        return structuredClone(value) as Value;
};

export const cloneRegistry = <DefinitionType>(
        registry: Registry<DefinitionType>,
): SerializedRegistry<DefinitionType> => {
        const entries = registry.entries();
        const result: SerializedRegistry<DefinitionType> = {};
        for (const [id, definition] of entries) {
                result[id] = typedStructuredClone(definition);
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
                entries[id] = Object.freeze(entry);
        }
        return Object.freeze(entries);
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

const deepFreeze = <Value>(value: Value): Value => {
        if (Array.isArray(value)) {
                for (const entry of value) {
                        deepFreeze(entry);
                }
                return Object.freeze(value) as unknown as Value;
        }
        if (value && typeof value === 'object') {
                const record = value as Record<PropertyKey, unknown>;
                for (const entry of Object.values(record)) {
                        deepFreeze(entry);
                }
                return Object.freeze(value);
        }
        return value;
};

const cloneResourceV2Definition = (
        definition: ResourceV2DefinitionConfig,
): ResourceV2DefinitionConfig => {
        return deepFreeze(typedStructuredClone(definition));
};

const cloneResourceV2GroupDefinition = (
        definition: ResourceV2GroupDefinitionConfig,
): ResourceV2GroupDefinitionConfig => {
        return deepFreeze(typedStructuredClone(definition));
};

const selectGlobalActionCost = (
	definitions: Record<string, ResourceV2DefinitionConfig>,
): SessionResourceGlobalCostReference | null => {
	let selected: {
		order: number;
		reference: SessionResourceGlobalCostReference;
	} | null = null;
	for (const definition of Object.values(definitions)) {
		const config = definition.globalActionCost;
		if (!config) {
			continue;
		}
		const order = definition.display.order ?? 0;
		if (!selected || order < selected.order) {
			selected = {
				order,
				reference: Object.freeze({
					resourceId: definition.id,
					amount: config.amount,
				}) as SessionResourceGlobalCostReference,
			};
		}
	}
	return selected ? selected.reference : null;
};

export const buildResourceValueRegistryPayload = ({
        definitions,
        groups,
}: {
        definitions: Iterable<ResourceV2DefinitionConfig>;
        groups: Iterable<ResourceV2GroupDefinitionConfig>;
}): SessionResourceRegistryPayload => {
        const definitionEntries: Record<string, ResourceV2DefinitionConfig> = {};
        for (const definition of definitions) {
                definitionEntries[definition.id] = cloneResourceV2Definition(definition);
        }
        const groupEntries: Record<string, ResourceV2GroupDefinitionConfig> = {};
        for (const group of groups) {
                groupEntries[group.id] = cloneResourceV2GroupDefinition(group);
        }
        const payload: SessionResourceRegistryPayload = {
                definitions: Object.freeze(definitionEntries) as Record<
                        string,
                        ResourceV2DefinitionConfig
                >,
                groups: Object.freeze(groupEntries) as Record<
                        string,
                        ResourceV2GroupDefinitionConfig
                >,
                globalActionCost: selectGlobalActionCost(definitionEntries),
        };
        return Object.freeze(payload);
};
