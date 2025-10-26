import type {
	SessionMetadataDescriptor,
	SessionRecentResourceGain,
	SessionResourceBoundsV2,
	SessionResourceCatalogV2,
} from '@kingdom-builder/protocol';
import type {
	TranslationResourceCatalogV2,
	TranslationResourceV2Metadata,
	TranslationResourceV2MetadataSelectors,
	TranslationSignedResourceGainSelectors,
} from './types';

export function cloneResourceValuesV2(
	values: Record<string, number>,
): Readonly<Record<string, number>> {
	return Object.freeze({ ...values });
}

export function cloneResourceBoundsV2(
	bounds: Record<string, SessionResourceBoundsV2>,
): Readonly<Record<string, SessionResourceBoundsV2>> {
	const cloned = Object.fromEntries(
		Object.entries(bounds).map(([id, entry]) => [
			id,
			Object.freeze({
				lowerBound: entry.lowerBound ?? null,
				upperBound: entry.upperBound ?? null,
			}),
		]),
	);
	return Object.freeze(cloned) as Readonly<
		Record<string, SessionResourceBoundsV2>
	>;
}

function cloneResourceCatalogRegistryV2<TDefinition extends { id: string }>(
	registry:
		| SessionResourceCatalogV2['resources']
		| SessionResourceCatalogV2['groups'],
): {
	ordered: readonly TDefinition[];
	byId: Readonly<Record<string, TDefinition>>;
} {
	const ordered = Object.freeze(
		registry.ordered.map(
			(entry) =>
				Object.freeze(structuredClone(entry)) as unknown as TDefinition,
		),
	);
	const byId = Object.freeze(
		Object.fromEntries(
			Object.entries(registry.byId).map(([id, entry]) => [
				id,
				Object.freeze(structuredClone(entry)) as unknown as TDefinition,
			]),
		),
	) as Readonly<Record<string, TDefinition>>;
	return { ordered, byId };
}

export function cloneResourceCatalogV2(
	catalog: SessionResourceCatalogV2,
): TranslationResourceCatalogV2 {
	const resources = cloneResourceCatalogRegistryV2(catalog.resources);
	const groups = cloneResourceCatalogRegistryV2(catalog.groups);
	return Object.freeze({
		resources,
		groups,
	}) as SessionResourceCatalogV2;
}

type MetadataRecord = Record<string, SessionMetadataDescriptor> | undefined;

function cloneMetadataFormat(
	descriptor: SessionMetadataDescriptor | undefined,
): SessionMetadataDescriptor['format'] | undefined {
	const format = descriptor?.format;
	if (format === undefined) {
		return undefined;
	}
	if (typeof format === 'object' && format !== null) {
		return Object.freeze({ ...format });
	}
	return format;
}

function createMetadataEntry(
	id: string,
	base:
		| {
				label?: string | null;
				icon?: string;
				description?: string | null;
				displayAsPercent?: boolean;
		  }
		| undefined,
	descriptor: SessionMetadataDescriptor | undefined,
): TranslationResourceV2Metadata {
	const label = descriptor?.label ?? base?.label ?? id;
	const entry: {
		id: string;
		label: string;
		icon?: string;
		description?: string | null;
		displayAsPercent?: boolean;
		format?: SessionMetadataDescriptor['format'];
	} = { id, label };
	const icon = descriptor?.icon ?? base?.icon;
	if (icon !== undefined) {
		entry.icon = icon;
	}
	const baseDescription = (base as { description?: string | null } | undefined)
		?.description;
	if (descriptor?.description !== undefined) {
		entry.description = descriptor.description;
	} else if (baseDescription !== undefined) {
		entry.description = baseDescription;
	}
	const displayAsPercent =
		descriptor?.displayAsPercent ?? base?.displayAsPercent;
	if (displayAsPercent !== undefined) {
		entry.displayAsPercent = displayAsPercent;
	}
	const format = cloneMetadataFormat(descriptor);
	if (format !== undefined) {
		entry.format = format;
	}
	return Object.freeze(entry) as TranslationResourceV2Metadata;
}

type MetadataFactory = (
	id: string,
	descriptor: SessionMetadataDescriptor | undefined,
) => TranslationResourceV2Metadata;

function createMetadataSelectors(
	entries: Array<[string, TranslationResourceV2Metadata]>,
	descriptorRecords: ReadonlyArray<MetadataRecord>,
	factory: MetadataFactory,
): TranslationResourceV2MetadataSelectors {
	const map = new Map(entries);
	const list = Object.freeze(entries.map(([, metadata]) => metadata));
	const cache = new Map<string, TranslationResourceV2Metadata>();
	return Object.freeze({
		list() {
			return list;
		},
		get(id: string) {
			const known = map.get(id);
			if (known) {
				return known;
			}
			const cached = cache.get(id);
			if (cached) {
				return cached;
			}
			let descriptor: SessionMetadataDescriptor | undefined;
			for (const record of descriptorRecords) {
				if (record && record[id]) {
					descriptor = record[id];
					break;
				}
			}
			const metadata = factory(id, descriptor);
			cache.set(id, metadata);
			return metadata;
		},
		has(id: string) {
			return map.has(id);
		},
	});
}

export function createResourceV2MetadataSelectors(
	catalog: TranslationResourceCatalogV2,
	metadata?: Record<string, SessionMetadataDescriptor>,
	fallbackMetadata?: Record<string, SessionMetadataDescriptor>,
): TranslationResourceV2MetadataSelectors {
	const entries: Array<[string, TranslationResourceV2Metadata]> = [];
	const seen = new Set<string>();
	if (catalog) {
		for (const definition of catalog.resources.ordered) {
			const descriptor =
				metadata?.[definition.id] ?? fallbackMetadata?.[definition.id];
			entries.push([
				definition.id,
				createMetadataEntry(definition.id, definition, descriptor),
			]);
			seen.add(definition.id);
		}
	}
	const descriptorRecords: ReadonlyArray<MetadataRecord> = [
		metadata,
		fallbackMetadata,
	];
	for (const record of descriptorRecords) {
		if (!record) {
			continue;
		}
		for (const [id, descriptor] of Object.entries(record)) {
			if (seen.has(id)) {
				continue;
			}
			const definition = catalog.resources.byId[id];
			entries.push([id, createMetadataEntry(id, definition, descriptor)]);
			seen.add(id);
		}
	}
	const factory: MetadataFactory = (id, descriptor) => {
		const definition = catalog.resources.byId[id];
		return createMetadataEntry(id, definition, descriptor);
	};
	return createMetadataSelectors(entries, descriptorRecords, factory);
}

export function createResourceV2GroupMetadataSelectors(
	catalog: TranslationResourceCatalogV2,
	metadata?: Record<string, SessionMetadataDescriptor>,
	fallbackMetadata?: Record<string, SessionMetadataDescriptor>,
): TranslationResourceV2MetadataSelectors {
	const entries: Array<[string, TranslationResourceV2Metadata]> = [];
	const seen = new Set<string>();
	if (catalog) {
		for (const definition of catalog.groups.ordered) {
			const descriptor =
				metadata?.[definition.id] ?? fallbackMetadata?.[definition.id];
			entries.push([
				definition.id,
				createMetadataEntry(definition.id, definition.parent, descriptor),
			]);
			seen.add(definition.id);
		}
	}
	const descriptorRecords: ReadonlyArray<MetadataRecord> = [
		metadata,
		fallbackMetadata,
	];
	for (const record of descriptorRecords) {
		if (!record) {
			continue;
		}
		for (const [id, descriptor] of Object.entries(record)) {
			if (seen.has(id)) {
				continue;
			}
			const definition = catalog.groups.byId[id];
			entries.push([
				id,
				createMetadataEntry(id, definition?.parent, descriptor),
			]);
			seen.add(id);
		}
	}
	const factory: MetadataFactory = (id, descriptor) => {
		const definition = catalog.groups.byId[id];
		return createMetadataEntry(id, definition?.parent, descriptor);
	};
	return createMetadataSelectors(entries, descriptorRecords, factory);
}

export function createSignedResourceGainSelectors(
	gains: ReadonlyArray<SessionRecentResourceGain>,
): TranslationSignedResourceGainSelectors {
	const list = Object.freeze(
		gains.map((entry) =>
			Object.freeze({ key: entry.key, amount: entry.amount }),
		),
	);
	const positives = Object.freeze(list.filter((entry) => entry.amount > 0));
	const negatives = Object.freeze(list.filter((entry) => entry.amount < 0));
	const byKeyCache = new Map<
		string,
		ReadonlyArray<SessionRecentResourceGain>
	>();
	return Object.freeze({
		list() {
			return list;
		},
		positives() {
			return positives;
		},
		negatives() {
			return negatives;
		},
		forResource(id: string) {
			const cached = byKeyCache.get(id);
			if (cached) {
				return cached;
			}
			const entries = Object.freeze(list.filter((entry) => entry.key === id));
			byKeyCache.set(id, entries);
			return entries;
		},
		sumForResource(id: string) {
			let total = 0;
			for (const entry of list) {
				if (entry.key === id) {
					total += entry.amount;
				}
			}
			return total;
		},
	});
}
