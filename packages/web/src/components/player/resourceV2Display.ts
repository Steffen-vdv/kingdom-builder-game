import type {
	PlayerSnapshotDeltaBucket,
	SessionPlayerStateSnapshot,
	SessionResourceBoundsV2,
	SessionResourceCatalogV2,
	SessionResourceDefinitionV2,
	SessionResourceGroupDefinitionV2,
} from '@kingdom-builder/protocol';
import {
	type ResourceV2MetadataSnapshot,
	type ResourceV2ValueSnapshot,
} from '../../translation/resourceV2';
import type {
	TranslationResourceV2Metadata,
	TranslationResourceV2MetadataSelectors,
	TranslationSignedResourceGainSelectors,
} from '../../translation/context';

export interface ResourceV2DisplayEntry {
	readonly id: string;
	readonly metadata: ResourceV2MetadataSnapshot;
	readonly definition: SessionResourceDefinitionV2;
	readonly snapshot: ResourceV2ValueSnapshot;
	readonly legacyKey?: string;
}

export interface ResourceV2GroupDisplay {
	readonly id: string;
	readonly definition: SessionResourceGroupDefinitionV2;
	readonly metadata: ResourceV2MetadataSnapshot;
	readonly snapshot: ResourceV2ValueSnapshot;
	readonly children: readonly ResourceV2DisplayEntry[];
}

export interface ResourceV2DisplayBuckets {
	readonly resources: readonly ResourceV2DisplayEntry[];
	readonly stats: readonly ResourceV2DisplayEntry[];
	readonly groups: readonly ResourceV2GroupDisplay[];
}

export interface ResourceV2LegacyResolvers {
	readonly resources?: LegacyKeyResolver;
	readonly stats?: LegacyKeyResolver;
	readonly population?: LegacyKeyResolver;
}

export type LegacyKeyResolver = (
	metadata: TranslationResourceV2Metadata,
) => string | undefined;

interface BuildOptions {
	readonly catalog: SessionResourceCatalogV2 | undefined;
	readonly metadata: TranslationResourceV2MetadataSelectors;
	readonly groupMetadata: TranslationResourceV2MetadataSelectors;
	readonly player: SessionPlayerStateSnapshot;
	readonly forecast?: PlayerSnapshotDeltaBucket | undefined;
	readonly signedGains: TranslationSignedResourceGainSelectors;
	readonly legacyResolvers?: ResourceV2LegacyResolvers;
}

interface ForecastSource {
	readonly bucket?: Record<string, number> | undefined;
	readonly resolver?: LegacyKeyResolver | undefined;
}

const STAT_SEGMENT = ':stat:';

type BoundsSnapshot = Partial<{
	lowerBound: number | null;
	upperBound: number | null;
}>;

function isStatDefinition(definition: SessionResourceDefinitionV2): boolean {
	return definition.id.includes(STAT_SEGMENT);
}

function resolveBounds(
	bounds: Readonly<Record<string, SessionResourceBoundsV2>> | undefined,
	id: string,
): BoundsSnapshot | undefined {
	const entry = bounds?.[id];
	if (!entry) {
		return undefined;
	}
	const result: BoundsSnapshot = {};
	if (entry.lowerBound !== undefined) {
		result.lowerBound = entry.lowerBound ?? null;
	}
	if (entry.upperBound !== undefined) {
		result.upperBound = entry.upperBound ?? null;
	}
	return result;
}

function resolveForecastDelta(
	metadata: TranslationResourceV2Metadata,
	source: ForecastSource,
): number | undefined {
	if (!source.bucket || !source.resolver) {
		return undefined;
	}
	const legacyKey = source.resolver(metadata);
	if (!legacyKey) {
		return undefined;
	}
	const delta = source.bucket[legacyKey];
	return typeof delta === 'number' ? delta : undefined;
}

function createSnapshot(
	id: string,
	current: number,
	bounds: BoundsSnapshot | undefined,
	delta: number | undefined,
	forecastDelta: number | undefined,
): ResourceV2ValueSnapshot {
	const boundFields = bounds ?? {};
	const deltaFields =
		typeof delta === 'number' && delta !== 0
			? { delta, previous: current - delta }
			: {};
	const forecastFields =
		typeof forecastDelta === 'number' && forecastDelta !== 0
			? { forecastDelta }
			: {};
	return {
		id,
		current,
		...boundFields,
		...deltaFields,
		...forecastFields,
	};
}

function compareByResolvedOrder(
	left: { definition: { resolvedOrder: number | null; id: string } },
	right: { definition: { resolvedOrder: number | null; id: string } },
): number {
	const leftOrder = left.definition.resolvedOrder ?? Number.MAX_SAFE_INTEGER;
	const rightOrder = right.definition.resolvedOrder ?? Number.MAX_SAFE_INTEGER;
	if (leftOrder !== rightOrder) {
		return leftOrder - rightOrder;
	}
	return left.definition.id.localeCompare(right.definition.id);
}

export function buildResourceV2DisplayBuckets(
	options: BuildOptions,
): ResourceV2DisplayBuckets {
	const {
		catalog,
		metadata,
		groupMetadata,
		player,
		forecast,
		signedGains,
		legacyResolvers,
	} = options;
	if (!catalog) {
		return { resources: [], stats: [], groups: [] };
	}
	const values = player.valuesV2 ?? {};
	const bounds = player.resourceBoundsV2;
	const resourceEntries: ResourceV2DisplayEntry[] = [];
	const statEntries: ResourceV2DisplayEntry[] = [];
	const groupChildren = new Map<string, ResourceV2DisplayEntry[]>();

	for (const definition of catalog.resources.ordered) {
		const metadataEntry = metadata.get(definition.id);
		const current = values?.[definition.id] ?? 0;
		const delta = signedGains.sumForResource(definition.id);
		const boundsEntry = resolveBounds(bounds, definition.id);
		const groupDefinition = definition.groupId
			? catalog.groups.byId[definition.groupId]
			: undefined;

		const legacyResolver = groupDefinition?.parent
			? legacyResolvers?.population
			: isStatDefinition(definition)
				? legacyResolvers?.stats
				: legacyResolvers?.resources;
		const forecastBucket = groupDefinition?.parent
			? forecast?.population
			: isStatDefinition(definition)
				? forecast?.stats
				: forecast?.resources;
		const forecastSource: ForecastSource = {
			bucket: forecastBucket,
			resolver: legacyResolver,
		};
		const legacyKey = legacyResolver
			? legacyResolver(metadataEntry)
			: undefined;

		const forecastDelta = resolveForecastDelta(metadataEntry, forecastSource);
		const snapshot = createSnapshot(
			definition.id,
			current,
			boundsEntry,
			delta,
			forecastDelta,
		);
		const entry: ResourceV2DisplayEntry = {
			id: definition.id,
			metadata: metadataEntry,
			definition,
			snapshot,
			...(legacyKey !== undefined ? { legacyKey } : {}),
		};

		if (groupDefinition?.parent) {
			const existing = groupChildren.get(groupDefinition.id) ?? [];
			existing.push(entry);
			groupChildren.set(groupDefinition.id, existing);
			continue;
		}

		if (isStatDefinition(definition)) {
			statEntries.push(entry);
			continue;
		}

		resourceEntries.push(entry);
	}

	resourceEntries.sort(compareByResolvedOrder);
	statEntries.sort(compareByResolvedOrder);

	const groupEntries: ResourceV2GroupDisplay[] = [];
	for (const definition of catalog.groups.ordered) {
		const children = groupChildren.get(definition.id);
		if (!children || !definition.parent) {
			continue;
		}
		children.sort(compareByResolvedOrder);
		const metadataEntry = groupMetadata.get(definition.id);
		const current = children.reduce(
			(total, entry) => total + entry.snapshot.current,
			0,
		);
		const delta = children.reduce(
			(total, entry) => total + (entry.snapshot.delta ?? 0),
			0,
		);
		const forecastDelta = children.reduce(
			(total, entry) => total + (entry.snapshot.forecastDelta ?? 0),
			0,
		);
		const boundsEntry: BoundsSnapshot = {};
		if (definition.parent.lowerBound !== undefined) {
			boundsEntry.lowerBound = definition.parent.lowerBound ?? null;
		}
		if (definition.parent.upperBound !== undefined) {
			boundsEntry.upperBound = definition.parent.upperBound ?? null;
		}
		const snapshot = createSnapshot(
			metadataEntry.id,
			current,
			boundsEntry,
			delta === 0 ? undefined : delta,
			forecastDelta === 0 ? undefined : forecastDelta,
		);
		groupEntries.push({
			id: definition.id,
			definition,
			metadata: metadataEntry,
			snapshot,
			children,
		});
	}

	groupEntries.sort(compareByResolvedOrder);

	return {
		resources: resourceEntries,
		stats: statEntries,
		groups: groupEntries,
	};
}

export function createLabelResolver(
	descriptors: ReadonlyArray<{ label?: string; id: string }>,
): LegacyKeyResolver {
	const labelMap = new Map<string, string>();
	descriptors.forEach((descriptor) => {
		const label = descriptor.label ?? '';
		const normalized = label.trim().toLowerCase();
		if (!normalized || labelMap.has(normalized)) {
			return;
		}
		labelMap.set(normalized, descriptor.id);
	});
	return (metadata: TranslationResourceV2Metadata) => {
		const label = metadata.label ?? metadata.id;
		const normalized = label.trim().toLowerCase();
		if (!normalized) {
			return undefined;
		}
		return labelMap.get(normalized);
	};
}
