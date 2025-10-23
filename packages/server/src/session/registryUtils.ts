import type {
	Registry,
	ResourceV2Definition,
	ResourceV2GroupMetadata,
	SerializedRegistry,
	SessionActionCategoryRegistry,
} from '@kingdom-builder/protocol';
import type { ActionCategoryConfig as ContentActionCategoryConfig } from '@kingdom-builder/contents';

type RegistrySource<Definition> =
	| Registry<Definition>
	| Readonly<Record<string, Definition>>
	| undefined;

const cloneDefinition = <Definition>(definition: Definition): Definition =>
	structuredClone(definition);

const toEntries = <Definition>(
	source: RegistrySource<Definition>,
): Array<readonly [string, Definition]> => {
	if (!source) {
		return [];
	}
	const maybeRegistry = source as Registry<Definition> | undefined;
	if (maybeRegistry && typeof maybeRegistry.entries === 'function') {
		return maybeRegistry.entries();
	}
	const record = source as Readonly<Record<string, Definition>>;
	return Object.entries(record);
};

const sortByOrder = <Definition extends { order: number }>(
	entries: Array<readonly [string, Definition]>,
) =>
	[...entries].sort((a, b) => {
		const [aId, aDefinition] = a;
		const [bId, bDefinition] = b;
		if (aDefinition.order !== bDefinition.order) {
			return aDefinition.order - bDefinition.order;
		}
		return aId.localeCompare(bId);
	});

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

const assignEntries = <Definition>(
	entries: Array<readonly [string, Definition]>,
): SerializedRegistry<Definition> => {
	const result: SerializedRegistry<Definition> = {};
	for (const [id, definition] of entries) {
		result[id] = cloneDefinition(definition);
	}
	return result;
};

export const cloneResourceV2Registry = (
	registry: RegistrySource<ResourceV2Definition>,
): SerializedRegistry<ResourceV2Definition> | undefined => {
	const entries = toEntries(registry);
	if (entries.length === 0) {
		return undefined;
	}
	return assignEntries(sortByOrder(entries));
};

export const cloneResourceV2GroupRegistry = (
	registry: RegistrySource<ResourceV2GroupMetadata>,
): SerializedRegistry<ResourceV2GroupMetadata> | undefined => {
	const entries = toEntries(registry);
	if (entries.length === 0) {
		return undefined;
	}
	return assignEntries(sortByOrder(entries));
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
