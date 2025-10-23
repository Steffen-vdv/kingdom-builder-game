import type {
	Registry,
	ResourceV2DefinitionConfig,
	ResourceV2GroupDefinitionConfig,
	SerializedRegistry,
	SessionActionCategoryRegistry,
	SessionResourceRegistryPayload,
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

const cloneResourceDefinition = (
	definition: ResourceV2DefinitionConfig,
): ResourceV2DefinitionConfig => {
	return structuredClone(definition);
};

const cloneResourceGroupDefinition = (
	definition: ResourceV2GroupDefinitionConfig,
): ResourceV2GroupDefinitionConfig => {
	return structuredClone(definition);
};

const buildGlobalCostReference = (
	definitions: ResourceV2DefinitionConfig[],
): SessionResourceRegistryPayload['globalActionCost'] => {
	const candidates = definitions
		.filter((definition) => definition.globalActionCost !== undefined)
		.map((definition) => ({
			order: definition.display.order ?? 0,
			reference: {
				resourceId: definition.id,
				amount: definition.globalActionCost!.amount,
			} as const,
		}));
	if (candidates.length === 0) {
		return null;
	}
	candidates.sort((left, right) => {
		if (left.order !== right.order) {
			return left.order - right.order;
		}
		return left.reference.resourceId.localeCompare(right.reference.resourceId);
	});
	return Object.freeze({ ...candidates[0]!.reference });
};

export const buildResourceRegistryPayload = (
	definitions: Iterable<ResourceV2DefinitionConfig>,
	groups: Iterable<ResourceV2GroupDefinitionConfig>,
): SessionResourceRegistryPayload => {
	const clonedDefinitions: ResourceV2DefinitionConfig[] = [];
	const definitionRecord: Record<string, ResourceV2DefinitionConfig> = {};
	for (const definition of definitions) {
		const cloned = cloneResourceDefinition(definition);
		clonedDefinitions.push(cloned);
		definitionRecord[cloned.id] = cloned;
	}

	const groupRecord: Record<string, ResourceV2GroupDefinitionConfig> = {};
	for (const group of groups) {
		const cloned = cloneResourceGroupDefinition(group);
		groupRecord[cloned.id] = cloned;
	}

	/* eslint-disable @typescript-eslint/no-unsafe-assignment */
	const globalActionCost = buildGlobalCostReference(clonedDefinitions);

	const definitionsRegistry: SerializedRegistry<ResourceV2DefinitionConfig> =
		freezeSerializedRegistry<ResourceV2DefinitionConfig>(definitionRecord);
	const groupRegistry: SerializedRegistry<ResourceV2GroupDefinitionConfig> =
		freezeSerializedRegistry<ResourceV2GroupDefinitionConfig>(groupRecord);
	/* eslint-disable @typescript-eslint/no-unsafe-assignment */
	const payload = {
		definitions: definitionsRegistry,
		groups: groupRegistry,
		globalActionCost,
	} satisfies SessionResourceRegistryPayload;
	/* eslint-enable @typescript-eslint/no-unsafe-assignment */
	Object.freeze(payload);
	return payload;
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
