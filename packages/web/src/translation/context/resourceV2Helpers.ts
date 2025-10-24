import type {
	SessionMetadataDescriptor,
	SessionResourceCatalogV2,
	SessionResourceDefinitionV2,
	SessionResourceGroupDefinitionV2,
} from '@kingdom-builder/protocol';
import type {
	TranslationResourceV2Catalog,
	TranslationResourceV2MetadataSelectors,
} from './types';
import type { ResourceV2MetadataSnapshot } from '../resourceV2';

function cloneResourceDefinitionV2(
	definition: SessionResourceDefinitionV2,
): SessionResourceDefinitionV2 {
	return JSON.parse(JSON.stringify(definition)) as SessionResourceDefinitionV2;
}

function cloneResourceGroupDefinitionV2(
	definition: SessionResourceGroupDefinitionV2,
): SessionResourceGroupDefinitionV2 {
	return JSON.parse(
		JSON.stringify(definition),
	) as SessionResourceGroupDefinitionV2;
}

export function wrapResourceCatalogV2(
	catalog: SessionResourceCatalogV2 | undefined,
): TranslationResourceV2Catalog | null {
	if (!catalog) {
		return null;
	}
	const resourceDefinitions = catalog.resources.ordered.map((definition) =>
		Object.freeze(cloneResourceDefinitionV2(definition)),
	);
	const resources = new Map(
		resourceDefinitions.map(
			(definition) => [definition.id, definition] as const,
		),
	);
	const groupDefinitions = catalog.groups.ordered.map((definition) =>
		Object.freeze(cloneResourceGroupDefinitionV2(definition)),
	);
	const groups = new Map(
		groupDefinitions.map((definition) => [definition.id, definition] as const),
	);
	return Object.freeze({
		getResource(id: string) {
			const definition = resources.get(id);
			if (!definition) {
				throw new Error(`Unknown ResourceV2 definition for id "${id}".`);
			}
			return definition;
		},
		hasResource(id: string) {
			return resources.has(id);
		},
		listResources() {
			return resourceDefinitions;
		},
		getGroup(id: string) {
			const definition = groups.get(id);
			if (!definition) {
				throw new Error(`Unknown ResourceV2 group definition for id "${id}".`);
			}
			return definition;
		},
		hasGroup(id: string) {
			return groups.has(id);
		},
		listGroups() {
			return groupDefinitions;
		},
	});
}

export interface TranslationResourceV2MetadataRegistry {
	readonly map: ReadonlyMap<string, ResourceV2MetadataSnapshot>;
	readonly ordered: readonly ResourceV2MetadataSnapshot[];
}

function freezeResourceV2Metadata(
	metadata: ResourceV2MetadataSnapshot,
): ResourceV2MetadataSnapshot {
	return Object.freeze({ ...metadata });
}

function buildMetadataFromDefinition(
	definition: SessionResourceDefinitionV2,
	descriptor: SessionMetadataDescriptor | undefined,
): ResourceV2MetadataSnapshot {
	const icon = descriptor?.icon ?? definition.icon;
	const description =
		descriptor?.description ??
		(definition.description === null
			? null
			: (definition.description ?? undefined));
	const displayAsPercent =
		descriptor?.displayAsPercent ??
		(definition.displayAsPercent ? true : undefined);
	const metadata: ResourceV2MetadataSnapshot = {
		id: definition.id,
		label: descriptor?.label ?? definition.label ?? definition.id,
		...(icon !== undefined ? { icon } : {}),
		...(description !== undefined ? { description } : {}),
		...(displayAsPercent !== undefined ? { displayAsPercent } : {}),
		...(descriptor?.format !== undefined ? { format: descriptor.format } : {}),
	};
	return freezeResourceV2Metadata(metadata);
}

function buildMetadataFromDescriptor(
	id: string,
	descriptor: SessionMetadataDescriptor,
): ResourceV2MetadataSnapshot {
	const metadata: ResourceV2MetadataSnapshot = {
		id,
		label: descriptor.label ?? id,
		...(descriptor.icon !== undefined ? { icon: descriptor.icon } : {}),
		...(descriptor.description !== undefined
			? { description: descriptor.description }
			: {}),
		...(descriptor.displayAsPercent !== undefined
			? { displayAsPercent: descriptor.displayAsPercent }
			: {}),
		...(descriptor.format !== undefined ? { format: descriptor.format } : {}),
	};
	return freezeResourceV2Metadata(metadata);
}

export function buildResourceV2MetadataRegistry(
	catalog: SessionResourceCatalogV2 | undefined,
	descriptors: Record<string, SessionMetadataDescriptor> | undefined,
): TranslationResourceV2MetadataRegistry {
	const ordered: ResourceV2MetadataSnapshot[] = [];
	const entries = new Map<string, ResourceV2MetadataSnapshot>();
	if (catalog) {
		for (const definition of catalog.resources.ordered) {
			const descriptor = definition ? descriptors?.[definition.id] : undefined;
			const metadata = buildMetadataFromDefinition(definition, descriptor);
			entries.set(definition.id, metadata);
			ordered.push(metadata);
		}
	}
	if (descriptors) {
		for (const [id, descriptor] of Object.entries(descriptors)) {
			if (entries.has(id)) {
				continue;
			}
			const metadata = buildMetadataFromDescriptor(id, descriptor);
			entries.set(id, metadata);
			ordered.push(metadata);
		}
	}
	return {
		map: entries,
		ordered: Object.freeze(ordered.slice()),
	};
}

export function createResourceV2MetadataSelectors(
	registry: TranslationResourceV2MetadataRegistry,
): TranslationResourceV2MetadataSelectors {
	const { map, ordered } = registry;
	return Object.freeze({
		get(id: string) {
			return map.get(id);
		},
		list() {
			return ordered;
		},
	});
}
