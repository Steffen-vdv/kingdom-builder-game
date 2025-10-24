import { Registry, type ResourceV2Definition, type ResourceV2GroupMetadata, resourceV2DefinitionSchema, resourceV2GroupMetadataSchema } from '@kingdom-builder/protocol';

export type FrozenRecord<TKey extends string, TValue> = Readonly<Record<TKey, TValue>>;

export function sortByOrder<T extends { order?: number }>(items: readonly T[]): T[] {
	return [...items].sort((a, b) => {
		const orderA = a.order ?? Number.POSITIVE_INFINITY;
		const orderB = b.order ?? Number.POSITIVE_INFINITY;

		return orderA - orderB;
	});
}

export function freezeMetadata<TMetadata extends object | undefined>(metadata: TMetadata): TMetadata {
	if (metadata) {
		Object.freeze(metadata);
	}

	return metadata;
}

export function freezeResourceV2Definition(definition: ResourceV2Definition): ResourceV2Definition {
	freezeMetadata(definition.metadata);

	if (definition.tierTrack) {
		definition.tierTrack.tiers.forEach((tier) => {
			Object.freeze(tier);
		});
		Object.freeze(definition.tierTrack.tiers);
		Object.freeze(definition.tierTrack);
	}

	return Object.freeze(definition);
}

export function freezeResourceV2Group(group: ResourceV2GroupMetadata): ResourceV2GroupMetadata {
	freezeMetadata(group.metadata);

	if (group.parent) {
		freezeMetadata(group.parent.metadata);
		Object.freeze(group.parent);
	}

	Object.freeze(group.children);

	return Object.freeze(group);
}

export function freezeRecord<TKey extends string, TValue>(entries: Array<[TKey, TValue]>): FrozenRecord<TKey, TValue> {
	const record = Object.fromEntries(entries) as Record<TKey, TValue>;

	return Object.freeze(record);
}

const RESOURCE_V2_DEFINITION_ENTRIES: ResourceV2Definition[] = [];

const RESOURCE_V2_GROUP_ENTRIES: ResourceV2GroupMetadata[] = [];

function buildDefinitionRegistry<TKey extends string>(entries: readonly ResourceV2Definition[]): FrozenRecord<TKey, ResourceV2Definition> {
	const registry = new Registry<ResourceV2Definition>(resourceV2DefinitionSchema);

	sortByOrder(entries).forEach((definition) => {
		const frozenDefinition = freezeResourceV2Definition(definition);

		registry.add(frozenDefinition.id as TKey, frozenDefinition);
	});

	const typedEntries = registry.entries().map(([id, definition]) => [id as TKey, definition] as [TKey, ResourceV2Definition]);

	return freezeRecord(typedEntries);
}

function buildGroupRegistry<TKey extends string>(entries: readonly ResourceV2GroupMetadata[]): FrozenRecord<TKey, ResourceV2GroupMetadata> {
	const registry = new Registry<ResourceV2GroupMetadata>(resourceV2GroupMetadataSchema);

	sortByOrder(entries).forEach((group) => {
		const frozenGroup = freezeResourceV2Group(group);

		registry.add(frozenGroup.id as TKey, frozenGroup);
	});

	const typedEntries = registry.entries().map(([id, group]) => [id as TKey, group] as [TKey, ResourceV2GroupMetadata]);

	return freezeRecord(typedEntries);
}

export function createResourceV2DefinitionScaffold<TKey extends string = string>(): FrozenRecord<TKey, ResourceV2Definition> {
	return buildDefinitionRegistry<TKey>(RESOURCE_V2_DEFINITION_ENTRIES);
}

export function createResourceV2GroupScaffold<TKey extends string = string>(): FrozenRecord<TKey, ResourceV2GroupMetadata> {
	return buildGroupRegistry<TKey>(RESOURCE_V2_GROUP_ENTRIES);
}

export const RESOURCE_V2_DEFINITION_SCAFFOLD = createResourceV2DefinitionScaffold();

export const RESOURCE_V2_GROUP_SCAFFOLD = createResourceV2GroupScaffold();
