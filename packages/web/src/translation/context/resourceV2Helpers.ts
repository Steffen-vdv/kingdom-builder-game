import type {
	SessionMetadataDescriptor,
	SessionPlayerId,
	SessionRecentResourceGain,
	SessionResourceCatalogV2,
	SessionResourceDefinitionV2,
	SessionResourceGroupParentV2,
} from '@kingdom-builder/protocol';
import {
	buildResourceV2SignedGainEntries,
	type ResourceV2MetadataSnapshot,
	type ResourceV2ValueSnapshot,
} from '../resourceV2';
import type {
	TranslationPlayer,
	TranslationResourceV2MetadataSelectors,
	TranslationResourceV2SignedGainSelectors,
} from './types';

const EMPTY_METADATA_LIST = Object.freeze(
	[],
) as readonly ResourceV2MetadataSnapshot[];
const EMPTY_SIGNED_GAINS = Object.freeze(
	[],
) as readonly SessionRecentResourceGain[];

function cloneMetadataFormat(
	format: SessionMetadataDescriptor['format'],
): SessionMetadataDescriptor['format'] | undefined {
	if (format === undefined) {
		return undefined;
	}
	if (typeof format === 'string') {
		return format;
	}
	return Object.freeze({ ...format });
}

function toResourceMetadataSnapshot(
	id: string,
	base: SessionResourceDefinitionV2 | SessionResourceGroupParentV2 | undefined,
	descriptor: SessionMetadataDescriptor | undefined,
): ResourceV2MetadataSnapshot {
	const label = descriptor?.label ?? base?.label ?? id;
	const icon = descriptor?.icon ?? base?.icon;
	const description = descriptor?.description ?? base?.description ?? null;
	const displayAsPercent =
		descriptor?.displayAsPercent ?? base?.displayAsPercent;
	const format = cloneMetadataFormat(descriptor?.format);
	return Object.freeze({
		id,
		label,
		...(icon !== undefined ? { icon } : {}),
		...(description !== undefined ? { description } : {}),
		...(displayAsPercent !== undefined ? { displayAsPercent } : {}),
		...(format !== undefined ? { format } : {}),
	});
}

function sortRemainder(
	ordered: readonly ResourceV2MetadataSnapshot[],
	entries: Iterable<ResourceV2MetadataSnapshot>,
): readonly ResourceV2MetadataSnapshot[] {
	const used = new Set(ordered.map((entry) => entry.id));
	const remainder = Array.from(entries).filter((entry) => !used.has(entry.id));
	remainder.sort((left, right) => left.id.localeCompare(right.id));
	if (remainder.length === 0) {
		return ordered;
	}
	return Object.freeze([...ordered, ...remainder]);
}

export function createResourceMetadataSelectors(
	catalog: SessionResourceCatalogV2 | undefined,
	descriptors: Record<string, SessionMetadataDescriptor> | undefined,
): TranslationResourceV2MetadataSelectors {
	const ids = new Set<string>();
	if (catalog) {
		for (const id of Object.keys(catalog.resources.byId)) {
			ids.add(id);
		}
	}
	if (descriptors) {
		for (const id of Object.keys(descriptors)) {
			ids.add(id);
		}
	}
	if (ids.size === 0) {
		return Object.freeze({
			has() {
				return false;
			},
			get() {
				return undefined;
			},
			list() {
				return EMPTY_METADATA_LIST;
			},
		});
	}
	const entries = new Map<string, ResourceV2MetadataSnapshot>();
	for (const id of ids) {
		const base = catalog?.resources.byId[id];
		const descriptor = descriptors?.[id];
		entries.set(id, toResourceMetadataSnapshot(id, base, descriptor));
	}
	const ordered: ResourceV2MetadataSnapshot[] = [];
	if (catalog) {
		for (const definition of catalog.resources.ordered) {
			const snapshot = entries.get(definition.id);
			if (snapshot) {
				ordered.push(snapshot);
			}
		}
	}
	const list = sortRemainder(Object.freeze(ordered), entries.values());
	return Object.freeze({
		has(id: string) {
			return entries.has(id);
		},
		get(id: string) {
			return entries.get(id);
		},
		list() {
			return list;
		},
	});
}

export function createResourceGroupMetadataSelectors(
	catalog: SessionResourceCatalogV2 | undefined,
	descriptors: Record<string, SessionMetadataDescriptor> | undefined,
): TranslationResourceV2MetadataSelectors {
	const ids = new Set<string>();
	if (catalog) {
		for (const id of Object.keys(catalog.groups.byId)) {
			ids.add(id);
		}
	}
	if (descriptors) {
		for (const id of Object.keys(descriptors)) {
			ids.add(id);
		}
	}
	if (ids.size === 0) {
		return Object.freeze({
			has() {
				return false;
			},
			get() {
				return undefined;
			},
			list() {
				return EMPTY_METADATA_LIST;
			},
		});
	}
	const entries = new Map<string, ResourceV2MetadataSnapshot>();
	for (const id of ids) {
		const definition = catalog?.groups.byId[id];
		const base = definition?.parent;
		const descriptor = descriptors?.[id];
		entries.set(id, toResourceMetadataSnapshot(id, base, descriptor));
	}
	const ordered: ResourceV2MetadataSnapshot[] = [];
	if (catalog) {
		for (const definition of catalog.groups.ordered) {
			const snapshot = entries.get(definition.id);
			if (snapshot) {
				ordered.push(snapshot);
			}
		}
	}
	const list = sortRemainder(Object.freeze(ordered), entries.values());
	return Object.freeze({
		has(id: string) {
			return entries.has(id);
		},
		get(id: string) {
			return entries.get(id);
		},
		list() {
			return list;
		},
	});
}

export function cloneResourceCatalogV2(
	catalog: SessionResourceCatalogV2 | undefined,
): SessionResourceCatalogV2 | undefined {
	if (!catalog) {
		return undefined;
	}
	const clone = JSON.parse(JSON.stringify(catalog)) as SessionResourceCatalogV2;
	return Object.freeze({
		resources: Object.freeze({
			byId: Object.freeze({ ...clone.resources.byId }),
			ordered: Object.freeze([...clone.resources.ordered]),
		}),
		groups: Object.freeze({
			byId: Object.freeze({ ...clone.groups.byId }),
			ordered: Object.freeze([...clone.groups.ordered]),
		}),
	});
}

export function createResourceSignedGainSelectors(
	players: ReadonlyMap<SessionPlayerId, TranslationPlayer>,
	recent: ReadonlyArray<SessionRecentResourceGain>,
): TranslationResourceV2SignedGainSelectors {
	if (recent.length === 0) {
		return Object.freeze({
			list() {
				return EMPTY_SIGNED_GAINS;
			},
			amount() {
				return undefined;
			},
			buildEntries() {
				return EMPTY_SIGNED_GAINS;
			},
		});
	}
	const amounts = new Map<string, number>();
	for (const entry of recent) {
		amounts.set(entry.key, entry.amount);
	}
	return Object.freeze({
		list() {
			return recent;
		},
		amount(id: string) {
			return amounts.get(id);
		},
		buildEntries(owner: SessionPlayerId, metadata: ResourceV2MetadataSnapshot) {
			if (!metadata || !amounts.has(metadata.id)) {
				return EMPTY_SIGNED_GAINS;
			}
			const player = players.get(owner);
			if (!player?.valuesV2) {
				return EMPTY_SIGNED_GAINS;
			}
			const current = player.valuesV2[metadata.id];
			if (typeof current !== 'number') {
				return EMPTY_SIGNED_GAINS;
			}
			const amount = amounts.get(metadata.id);
			if (amount === undefined || amount === 0) {
				return EMPTY_SIGNED_GAINS;
			}
			const bounds = player.resourceBoundsV2?.[metadata.id];
			const snapshot: ResourceV2ValueSnapshot = {
				id: metadata.id,
				current,
				delta: amount,
				previous: current - amount,
				lowerBound: bounds?.lowerBound ?? null,
				upperBound: bounds?.upperBound ?? null,
			};
			const entries = buildResourceV2SignedGainEntries(metadata, snapshot);
			if (!entries.length) {
				return EMPTY_SIGNED_GAINS;
			}
			return Object.freeze(entries);
		},
	});
}
