import type { SessionMetadataDescriptor } from '@kingdom-builder/protocol';
import type {
	SessionResourceV2GroupParentSnapshot,
	SessionResourceV2GroupSnapshot,
	SessionResourceV2MetadataSnapshot,
	SessionSnapshotMetadata,
} from '@kingdom-builder/protocol/session';
import type {
	AssetMetadata,
	MetadataLookup,
} from './registryMetadataDescriptors';

export interface MetadataSelector<TDescriptor extends { id: string }> {
	readonly byId: Readonly<Record<string, TDescriptor>>;
	readonly list: ReadonlyArray<TDescriptor>;
	select(id: string): TDescriptor;
	selectMany(ids: Iterable<string>): ReadonlyArray<TDescriptor>;
	selectRecord(ids: Iterable<string>): Readonly<Record<string, TDescriptor>>;
}

export interface AssetMetadataSelector {
	readonly descriptor: AssetMetadata;
	select(): AssetMetadata;
}

const freezeArray = <T>(values: T[]): ReadonlyArray<T> =>
	Object.freeze(values.slice());

const EMPTY_STRING_ARRAY: ReadonlyArray<string> = Object.freeze([]);
const EMPTY_STRING_RECORD: Readonly<Record<string, string>> = Object.freeze({});

export const createMetadataSelector = <TDescriptor extends { id: string }>(
	lookup: MetadataLookup<TDescriptor>,
): MetadataSelector<TDescriptor> => {
	const list = lookup.values();
	const byId = lookup.record;
	const select = (id: string): TDescriptor => lookup.get(id);
	const selectMany = (ids: Iterable<string>): ReadonlyArray<TDescriptor> =>
		freezeArray(Array.from(ids, (id) => select(id)));
	const selectRecord = (
		ids: Iterable<string>,
	): Readonly<Record<string, TDescriptor>> => {
		const entries = Array.from(ids, (id) => [id, select(id)] as const);
		return Object.freeze(Object.fromEntries(entries)) as Readonly<
			Record<string, TDescriptor>
		>;
	};
	return Object.freeze({
		byId,
		list,
		select,
		selectMany,
		selectRecord,
	});
};

export const createAssetMetadataSelector = (
	descriptor: AssetMetadata,
): AssetMetadataSelector =>
	Object.freeze({
		descriptor,
		select: () => descriptor,
	});

const readMetadataEntry = (
	snapshot: SessionSnapshotMetadata,
	key: string,
): unknown => {
	if (typeof snapshot !== 'object' || snapshot === null) {
		return undefined;
	}
	if (!Object.prototype.hasOwnProperty.call(snapshot, key)) {
		return undefined;
	}
	const record = snapshot as unknown as Record<string, unknown>;
	return record[key];
};

const toUnknownRecord = (
	value: unknown,
): Record<string, unknown> | undefined => {
	if (typeof value !== 'object' || value === null) {
		return undefined;
	}
	return value as Record<string, unknown>;
};

const isMetadataDescriptor = (
	value: unknown,
): value is SessionMetadataDescriptor =>
	typeof value === 'object' && value !== null;

const toMetadataDescriptorRecord = (
	value: unknown,
): Record<string, SessionMetadataDescriptor> | undefined => {
	const record = toUnknownRecord(value);
	if (!record) {
		return undefined;
	}
	for (const descriptor of Object.values(record)) {
		if (!isMetadataDescriptor(descriptor)) {
			return undefined;
		}
	}
	return record as Record<string, SessionMetadataDescriptor>;
};

const toSnapshotRecord = <TSnapshot>(
	value: unknown,
): Record<string, TSnapshot> | undefined => {
	const record = toUnknownRecord(value);
	if (!record) {
		return undefined;
	}
	for (const entry of Object.values(record)) {
		if (typeof entry !== 'object' || entry === null) {
			return undefined;
		}
	}
	return record as Record<string, TSnapshot>;
};

const toStringArray = (value: unknown): ReadonlyArray<string> | undefined => {
	if (!Array.isArray(value)) {
		return undefined;
	}
	if (value.length === 0) {
		return EMPTY_STRING_ARRAY;
	}
	const entries = value.filter(
		(entry): entry is string => typeof entry === 'string',
	);
	if (entries.length === 0) {
		return EMPTY_STRING_ARRAY;
	}
	return Object.freeze(entries.slice());
};

const toStringRecord = (
	value: unknown,
): Readonly<Record<string, string>> | undefined => {
	const record = toUnknownRecord(value);
	if (!record) {
		return undefined;
	}
	const entries: Record<string, string> = {};
	for (const [key, entry] of Object.entries(record)) {
		if (typeof entry !== 'string') {
			continue;
		}
		entries[key] = entry;
	}
	if (Object.keys(entries).length === 0) {
		return EMPTY_STRING_RECORD;
	}
	return Object.freeze(entries);
};

export const extractDescriptorRecord = (
	snapshot: SessionSnapshotMetadata,
	key: string,
): Record<string, SessionMetadataDescriptor> | undefined =>
	toMetadataDescriptorRecord(readMetadataEntry(snapshot, key));

export const extractResourceMetadataRecord = (
	snapshot: SessionSnapshotMetadata,
): Record<string, SessionResourceV2MetadataSnapshot> | undefined =>
	toSnapshotRecord<SessionResourceV2MetadataSnapshot>(
		readMetadataEntry(snapshot, 'resourceMetadata'),
	);

export const extractResourceGroupRecord = (
	snapshot: SessionSnapshotMetadata,
): Record<string, SessionResourceV2GroupSnapshot> | undefined =>
	toSnapshotRecord<SessionResourceV2GroupSnapshot>(
		readMetadataEntry(snapshot, 'resourceGroups'),
	);

export const extractResourceGroupParentRecord = (
	snapshot: SessionSnapshotMetadata,
): Record<string, SessionResourceV2GroupParentSnapshot> | undefined =>
	toSnapshotRecord<SessionResourceV2GroupParentSnapshot>(
		readMetadataEntry(snapshot, 'resourceGroupParents'),
	);

export const extractPhaseRecord = (
	snapshot: SessionSnapshotMetadata,
): SessionSnapshotMetadata['phases'] => {
	const record = toUnknownRecord(readMetadataEntry(snapshot, 'phases'));
	if (!record) {
		return undefined as SessionSnapshotMetadata['phases'];
	}
	return record as SessionSnapshotMetadata['phases'];
};

export const extractTriggerRecord = (
	snapshot: SessionSnapshotMetadata,
): SessionSnapshotMetadata['triggers'] => {
	const record = toUnknownRecord(readMetadataEntry(snapshot, 'triggers'));
	if (!record) {
		return undefined as SessionSnapshotMetadata['triggers'];
	}
	return record as SessionSnapshotMetadata['triggers'];
};

export const extractOrderedResourceIds = (
	snapshot: SessionSnapshotMetadata,
): ReadonlyArray<string> | undefined =>
	toStringArray(readMetadataEntry(snapshot, 'orderedResourceIds'));

export const extractOrderedResourceGroupIds = (
	snapshot: SessionSnapshotMetadata,
): ReadonlyArray<string> | undefined =>
	toStringArray(readMetadataEntry(snapshot, 'orderedResourceGroupIds'));

export const extractParentIdByResourceId = (
	snapshot: SessionSnapshotMetadata,
): Readonly<Record<string, string>> | undefined =>
	toStringRecord(readMetadataEntry(snapshot, 'parentIdByResourceId'));

export const EMPTY_ORDERED_RESOURCE_IDS = EMPTY_STRING_ARRAY;
export const EMPTY_ORDERED_RESOURCE_GROUP_IDS = EMPTY_STRING_ARRAY;
export const EMPTY_PARENT_ID_BY_RESOURCE_ID = EMPTY_STRING_RECORD;
