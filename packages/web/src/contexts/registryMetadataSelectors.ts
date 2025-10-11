import type { SessionMetadataDescriptor } from '@kingdom-builder/protocol';
import type { SessionSnapshotMetadata } from '@kingdom-builder/protocol/session';
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

export const extractDescriptorRecord = (
	snapshot: SessionSnapshotMetadata,
	key: string,
): Record<string, SessionMetadataDescriptor> | undefined =>
	toMetadataDescriptorRecord(readMetadataEntry(snapshot, key));

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
