import type { SessionSnapshotMetadata } from '@kingdom-builder/protocol/session';
import {
	DEFAULT_OVERVIEW_CONTENT,
	DEFAULT_REGISTRY_METADATA,
	type OverviewContentTemplate,
} from './defaultRegistryMetadata';
import {
	extractDescriptorRecord,
	extractPhaseRecord,
	extractTriggerRecord,
} from './registryMetadataSelectors';

export const DEFAULT_RESOURCE_DESCRIPTOR_RECORD = extractDescriptorRecord(
	DEFAULT_REGISTRY_METADATA,
	'resources',
);
export const DEFAULT_POPULATION_DESCRIPTOR_RECORD = extractDescriptorRecord(
	DEFAULT_REGISTRY_METADATA,
	'populations',
);
export const DEFAULT_BUILDING_DESCRIPTOR_RECORD = extractDescriptorRecord(
	DEFAULT_REGISTRY_METADATA,
	'buildings',
);
export const DEFAULT_DEVELOPMENT_DESCRIPTOR_RECORD = extractDescriptorRecord(
	DEFAULT_REGISTRY_METADATA,
	'developments',
);
export const DEFAULT_STAT_DESCRIPTOR_RECORD = extractDescriptorRecord(
	DEFAULT_REGISTRY_METADATA,
	'stats',
);
export const DEFAULT_ASSET_DESCRIPTOR_RECORD = extractDescriptorRecord(
	DEFAULT_REGISTRY_METADATA,
	'assets',
);
export const DEFAULT_PHASE_RECORD = extractPhaseRecord(
	DEFAULT_REGISTRY_METADATA,
);
export const DEFAULT_TRIGGER_RECORD = extractTriggerRecord(
	DEFAULT_REGISTRY_METADATA,
);

export const mergeMetadataRecords = <TValue>(
	override: Record<string, TValue> | undefined,
	fallback: Record<string, TValue> | undefined,
): Record<string, TValue> | undefined => {
	if (!override && !fallback) {
		return undefined;
	}
	if (!fallback) {
		return override;
	}
	if (!override) {
		return fallback;
	}
	if (override === fallback) {
		return override;
	}
	return Object.freeze({
		...fallback,
		...override,
	}) as Record<string, TValue>;
};

export const extractOverviewContent = (
	snapshot: SessionSnapshotMetadata,
): OverviewContentTemplate | undefined => {
	if (typeof snapshot !== 'object' || snapshot === null) {
		return undefined;
	}
	const metadataRecord = snapshot as unknown as Record<string, unknown>;
	const overviewContent = metadataRecord['overviewContent'];
	if (typeof overviewContent === 'object' && overviewContent !== null) {
		return overviewContent as OverviewContentTemplate;
	}
	const overview = metadataRecord['overview'];
	if (typeof overview === 'object' && overview !== null) {
		return overview as OverviewContentTemplate;
	}
	return undefined;
};

export { DEFAULT_OVERVIEW_CONTENT };
export type { OverviewContentTemplate };
