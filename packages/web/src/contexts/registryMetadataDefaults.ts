import type {
	SessionOverviewMetadata,
	SessionSnapshotMetadata,
} from '@kingdom-builder/protocol/session';
import { DEFAULT_REGISTRY_METADATA } from './defaultRegistryMetadata';
import {
	resolveAssetDescriptor,
	type AssetMetadata,
} from './registryMetadataDescriptors';
import {
	extractDescriptorRecord,
	extractPhaseRecord,
	extractTriggerRecord,
} from './registryMetadataSelectors';

export type SnapshotMetadataWithOverview = SessionSnapshotMetadata & {
	overviewContent?: SessionOverviewMetadata;
	overview?: SessionOverviewMetadata;
};

const DEFAULT_METADATA =
	DEFAULT_REGISTRY_METADATA as SnapshotMetadataWithOverview;

const FALLBACK_OVERVIEW_CONTENT: SessionOverviewMetadata = {
	hero: { tokens: {} },
	sections: [],
	tokens: {},
};

const DEFAULT_OVERVIEW_SOURCE: SessionOverviewMetadata =
	DEFAULT_METADATA.overviewContent ??
	DEFAULT_METADATA.overview ??
	FALLBACK_OVERVIEW_CONTENT;

export const DEFAULT_RESOURCE_METADATA = extractDescriptorRecord(
	DEFAULT_METADATA,
	'resources',
);
export const DEFAULT_POPULATION_METADATA = extractDescriptorRecord(
	DEFAULT_METADATA,
	'populations',
);
export const DEFAULT_BUILDING_METADATA = extractDescriptorRecord(
	DEFAULT_METADATA,
	'buildings',
);
export const DEFAULT_DEVELOPMENT_METADATA = extractDescriptorRecord(
	DEFAULT_METADATA,
	'developments',
);
export const DEFAULT_STAT_METADATA = extractDescriptorRecord(
	DEFAULT_METADATA,
	'stats',
);
export const DEFAULT_ASSET_METADATA = extractDescriptorRecord(
	DEFAULT_METADATA,
	'assets',
);
export const DEFAULT_PHASE_METADATA = extractPhaseRecord(DEFAULT_METADATA);
export const DEFAULT_TRIGGER_METADATA = extractTriggerRecord(DEFAULT_METADATA);

const createAssetFallback = (id: string, label: string): AssetMetadata =>
	Object.freeze({ id, label }) as AssetMetadata;

export const DEFAULT_LAND_DESCRIPTOR = resolveAssetDescriptor(
	'land',
	DEFAULT_ASSET_METADATA?.land,
	createAssetFallback('land', 'Land'),
);

export const DEFAULT_SLOT_DESCRIPTOR = resolveAssetDescriptor(
	'slot',
	DEFAULT_ASSET_METADATA?.slot,
	createAssetFallback('slot', 'Development Slot'),
);

export const DEFAULT_PASSIVE_DESCRIPTOR = resolveAssetDescriptor(
	'passive',
	DEFAULT_ASSET_METADATA?.passive,
	createAssetFallback('passive', 'Passive'),
);

export const DEFAULT_OVERVIEW_CONTENT: SessionOverviewMetadata = Object.freeze(
	DEFAULT_OVERVIEW_SOURCE,
);

export const mergeDescriptorRecords = <TValue>(
	base: Readonly<Record<string, TValue>> | undefined,
	override: Readonly<Record<string, TValue>> | undefined,
): Readonly<Record<string, TValue>> | undefined => {
	if (!base && !override) {
		return undefined;
	}
	if (!override) {
		return base;
	}
	if (!base) {
		return Object.freeze({ ...override });
	}
	if (override === base) {
		return base;
	}
	return Object.freeze({ ...base, ...override });
};

export const resolveOverviewContent = (
	snapshotMetadata: SessionSnapshotMetadata | null | undefined,
): SessionOverviewMetadata => {
	if (snapshotMetadata) {
		const extended = snapshotMetadata as SnapshotMetadataWithOverview;
		const overridden = extended.overviewContent ?? extended.overview;
		if (overridden) {
			return overridden;
		}
	}
	return DEFAULT_OVERVIEW_CONTENT;
};
