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
	values: Record<string, number> | undefined,
): Readonly<Record<string, number>> {
	if (!values) {
		return Object.freeze({});
	}
	return Object.freeze({ ...values });
}

export function cloneResourceBoundsV2(
	bounds: Record<string, SessionResourceBoundsV2> | undefined,
): Readonly<Record<string, SessionResourceBoundsV2>> {
	if (!bounds) {
		return Object.freeze({});
	}
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
		| SessionResourceCatalogV2['groups']
		| SessionResourceCatalogV2['categories'],
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

const EMPTY_CATEGORY_REGISTRY = Object.freeze({
	ordered: Object.freeze([]),
	byId: Object.freeze({}),
});

export function cloneResourceCatalogV2(
	catalog: SessionResourceCatalogV2,
): TranslationResourceCatalogV2 {
	const resources = cloneResourceCatalogRegistryV2(catalog.resources);
	const groups = cloneResourceCatalogRegistryV2(catalog.groups);
	const categories = catalog.categories
		? cloneResourceCatalogRegistryV2(catalog.categories)
		: EMPTY_CATEGORY_REGISTRY;
	return Object.freeze({
		resources,
		groups,
		categories,
	}) as SessionResourceCatalogV2;
}

type MetadataRecord = Record<string, SessionMetadataDescriptor> | undefined;

function cloneMetadataFormat(
	descriptor: SessionMetadataDescriptor | undefined,
): SessionMetadataDescriptor['format'] {
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
				groupId?: string | null;
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
		groupId?: string | null;
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
	const groupId = base?.groupId;
	if (groupId !== undefined) {
		entry.groupId = groupId;
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
	for (const definition of catalog.resources.ordered) {
		const descriptor =
			metadata?.[definition.id] ?? fallbackMetadata?.[definition.id];
		entries.push([
			definition.id,
			createMetadataEntry(definition.id, definition, descriptor),
		]);
		seen.add(definition.id);
	}
	// Index parent resources from groups so effects can look them up
	for (const group of catalog.groups.ordered) {
		if (group.parent && !seen.has(group.parent.id)) {
			const descriptor =
				metadata?.[group.parent.id] ?? fallbackMetadata?.[group.parent.id];
			entries.push([
				group.parent.id,
				createMetadataEntry(group.parent.id, group.parent, descriptor),
			]);
			seen.add(group.parent.id);
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
		// Check if this is a parent resource from a group
		for (const group of catalog.groups.ordered) {
			if (group.parent?.id === id) {
				return createMetadataEntry(id, group.parent, descriptor);
			}
		}
		const definition = catalog.resources.byId[id];
		return createMetadataEntry(id, definition, descriptor);
	};
	return createMetadataSelectors(entries, descriptorRecords, factory);
}

/**
 * Extracts group display metadata. Groups MUST have their own label and icon;
 * we do NOT fall back to parent values since that hides misconfiguration.
 * Missing fields show obvious placeholders ("??") to signal broken config.
 */
function extractGroupMetadata(
	def: TranslationResourceCatalogV2['groups']['ordered'][number],
) {
	return {
		label: def.label ?? '??',
		icon: def.icon ?? '❓',
		description: def.parent?.description ?? null,
	};
}

export function createResourceV2GroupMetadataSelectors(
	catalog: TranslationResourceCatalogV2,
	metadata?: Record<string, SessionMetadataDescriptor>,
	fallbackMetadata?: Record<string, SessionMetadataDescriptor>,
): TranslationResourceV2MetadataSelectors {
	const entries: Array<[string, TranslationResourceV2Metadata]> = [];
	const seen = new Set<string>();
	for (const def of catalog.groups.ordered) {
		const desc = metadata?.[def.id] ?? fallbackMetadata?.[def.id];
		entries.push([
			def.id,
			createMetadataEntry(def.id, extractGroupMetadata(def), desc),
		]);
		seen.add(def.id);
	}
	const descriptorRecords: ReadonlyArray<MetadataRecord> = [
		metadata,
		fallbackMetadata,
	];
	for (const record of descriptorRecords) {
		if (!record) {
			continue;
		}
		for (const [id, desc] of Object.entries(record)) {
			if (seen.has(id)) {
				continue;
			}
			const def = catalog.groups.byId[id];
			const base = def ? extractGroupMetadata(def) : undefined;
			entries.push([id, createMetadataEntry(id, base, desc)]);
			seen.add(id);
		}
	}
	const factory: MetadataFactory = (id, desc) => {
		const def = catalog.groups.byId[id];
		return createMetadataEntry(
			id,
			def ? extractGroupMetadata(def) : undefined,
			desc,
		);
	};
	return createMetadataSelectors(entries, descriptorRecords, factory);
}

export function createSignedResourceGainSelectors(
	gains: ReadonlyArray<SessionRecentResourceGain>,
): TranslationSignedResourceGainSelectors {
	const list = Object.freeze(
		gains.map((e) => Object.freeze({ key: e.key, amount: e.amount })),
	);
	const positives = Object.freeze(list.filter((e) => e.amount > 0));
	const negatives = Object.freeze(list.filter((e) => e.amount < 0));
	const cache = new Map<string, ReadonlyArray<SessionRecentResourceGain>>();
	return Object.freeze({
		list: () => list,
		positives: () => positives,
		negatives: () => negatives,
		forResource(id: string) {
			let result = cache.get(id);
			if (!result) {
				result = Object.freeze(list.filter((e) => e.key === id));
				cache.set(id, result);
			}
			return result;
		},
		sumForResource(id: string) {
			return list.reduce((t, e) => (e.key === id ? t + e.amount : t), 0);
		},
	});
}
