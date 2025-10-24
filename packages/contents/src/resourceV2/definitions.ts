import type { ResourceV2Definition, ResourceV2GroupMetadata } from '@kingdom-builder/protocol';

type Orderable = { order: number };

type MetadataRecord = Readonly<Record<string, unknown>>;

export interface ResourceV2DefinitionScaffold {
	readonly definitions: ReadonlyArray<ResourceV2Definition>;
	readonly groups: ReadonlyArray<ResourceV2GroupMetadata>;
}

const EMPTY_DEFINITIONS: ReadonlyArray<ResourceV2Definition> = Object.freeze([]);
const EMPTY_GROUPS: ReadonlyArray<ResourceV2GroupMetadata> = Object.freeze([]);

export const RESOURCE_V2_DEFINITION_SCAFFOLD: ResourceV2DefinitionScaffold = Object.freeze({
	definitions: EMPTY_DEFINITIONS,
	groups: EMPTY_GROUPS,
});

export function createOrderGenerator(start = 0) {
	let current = start;
	return () => current++;
}

export function orderByAscending<T extends Orderable>(entries: Iterable<T>): T[] {
	return [...entries].sort((a, b) => a.order - b.order);
}

export function createSharedMetadata<TMetadata extends Record<string, unknown>>(metadata: TMetadata): MetadataRecord {
	return Object.freeze({ ...metadata });
}

export function assignSharedMetadata<TEntry extends { metadata?: MetadataRecord | undefined }>(entry: TEntry, metadata: MetadataRecord | undefined): TEntry {
	return {
		...entry,
		metadata,
	};
}
