import type {
	SessionMetadataDescriptor,
	SessionRecentResourceGain,
	SessionResourceBounds,
	SessionResourceCatalog,
} from '@kingdom-builder/protocol';
import type {
	TranslationResourceCatalog,
	TranslationResourceMetadata,
	TranslationResourceMetadataSelectors,
	TranslationSignedResourceGainSelectors,
} from './types';

export function cloneResourceValues(
	values: Record<string, number> | undefined,
): Readonly<Record<string, number>> {
	if (!values) {
		return Object.freeze({});
	}
	return Object.freeze({ ...values });
}

export function cloneResourceBounds(
	bounds: Record<string, SessionResourceBounds> | undefined,
): Readonly<Record<string, SessionResourceBounds>> {
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
		Record<string, SessionResourceBounds>
	>;
}

function cloneResourceCatalogRegistry<TDefinition extends { id: string }>(
	registry:
		| SessionResourceCatalog['resources']
		| SessionResourceCatalog['groups']
		| SessionResourceCatalog['categories'],
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

export function cloneResourceCatalog(
	catalog: SessionResourceCatalog,
): TranslationResourceCatalog {
	const resources = cloneResourceCatalogRegistry(catalog.resources);
	const groups = cloneResourceCatalogRegistry(catalog.groups);
	const categories = catalog.categories
		? cloneResourceCatalogRegistry(catalog.categories)
		: EMPTY_CATEGORY_REGISTRY;
	return Object.freeze({
		resources,
		groups,
		categories,
	}) as SessionResourceCatalog;
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
): TranslationResourceMetadata {
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
	return Object.freeze(entry) as TranslationResourceMetadata;
}

type MetadataFactory = (
	id: string,
	descriptor: SessionMetadataDescriptor | undefined,
) => TranslationResourceMetadata;

function createMetadataSelectors(
	entries: Array<[string, TranslationResourceMetadata]>,
	descriptorRecords: ReadonlyArray<MetadataRecord>,
	factory: MetadataFactory,
): TranslationResourceMetadataSelectors {
	const map = new Map(entries);
	const list = Object.freeze(entries.map(([, metadata]) => metadata));
	const cache = new Map<string, TranslationResourceMetadata>();
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

export function createResourceMetadataSelectors(
	catalog: TranslationResourceCatalog,
	metadata?: Record<string, SessionMetadataDescriptor>,
	fallbackMetadata?: Record<string, SessionMetadataDescriptor>,
): TranslationResourceMetadataSelectors {
	const entries: Array<[string, TranslationResourceMetadata]> = [];
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
 * Extracts group display metadata. Groups MUST have their own label and icon
 * defined in content. Missing values show visible placeholders to surface
 * content gaps during development.
 */
function extractGroupMetadata(
	def: TranslationResourceCatalog['groups']['ordered'][number],
) {
	return {
		label: def.label ?? `[MISSING:${def.id}]`,
		icon: def.icon ?? '⚠️',
		description: def.parent?.description ?? null,
	};
}

export function createResourceGroupMetadataSelectors(
	catalog: TranslationResourceCatalog,
	metadata?: Record<string, SessionMetadataDescriptor>,
	fallbackMetadata?: Record<string, SessionMetadataDescriptor>,
): TranslationResourceMetadataSelectors {
	const entries: Array<[string, TranslationResourceMetadata]> = [];
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
		gains.map((e) =>
			Object.freeze({ resourceId: e.resourceId, amount: e.amount }),
		),
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
				result = Object.freeze(list.filter((e) => e.resourceId === id));
				cache.set(id, result);
			}
			return result;
		},
		sumForResource(id: string) {
			return list.reduce((t, e) => (e.resourceId === id ? t + e.amount : t), 0);
		},
	});
}
