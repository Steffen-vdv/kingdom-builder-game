import type {
	SessionRegistriesPayload,
	SessionSnapshotMetadata,
} from '@kingdom-builder/protocol/session';
import { clone } from '../services/gameApi.clone';
import { deserializeSessionRegistries } from '../state/sessionRegistries';
import type { SessionRegistries } from '../state/sessionRegistries';
import snapshot from './defaultRegistryMetadata.json';

interface DefaultRegistrySnapshot {
	readonly registries: SessionRegistriesPayload;
	readonly metadata: SessionSnapshotMetadata;
}

function deepFreeze<T>(value: T): T {
	if (Array.isArray(value)) {
		for (const entry of value) {
			deepFreeze(entry);
		}
		return Object.freeze(value) as unknown as T;
	}
	if (value !== null && typeof value === 'object') {
		for (const entry of Object.values(value as Record<string, unknown>)) {
			deepFreeze(entry);
		}
		return Object.freeze(value);
	}
	return value;
}

function freezeRegistries(registries: SessionRegistries): SessionRegistries {
	deepFreeze(registries.resources);
	return Object.freeze(registries);
}

const SNAPSHOT = deepFreeze(snapshot) as DefaultRegistrySnapshot;

const cloneAndFreeze = <T>(value: T): T => deepFreeze(clone(value));

function createFrozenRegistries(): SessionRegistries {
	const registries = deserializeSessionRegistries(SNAPSHOT.registries);
	return freezeRegistries(registries);
}

const DEFAULT_REGISTRIES_INTERNAL = createFrozenRegistries();
const DEFAULT_METADATA_INTERNAL = cloneAndFreeze(SNAPSHOT.metadata);
const DEFAULT_TRIGGER_METADATA_INTERNAL = cloneAndFreeze(
	SNAPSHOT.metadata.triggers ?? {},
);
const DEFAULT_ASSET_METADATA_INTERNAL = cloneAndFreeze(
	SNAPSHOT.metadata.assets ?? {},
);
const DEFAULT_OVERVIEW_CONTENT_INTERNAL = cloneAndFreeze(
	SNAPSHOT.metadata.overviewContent,
);

export const DEFAULT_REGISTRIES: SessionRegistries =
	DEFAULT_REGISTRIES_INTERNAL;

export const DEFAULT_REGISTRY_METADATA: SessionSnapshotMetadata =
	DEFAULT_METADATA_INTERNAL;

export const DEFAULT_TRIGGER_METADATA = DEFAULT_TRIGGER_METADATA_INTERNAL;

export const DEFAULT_ASSET_METADATA = DEFAULT_ASSET_METADATA_INTERNAL;

export const DEFAULT_OVERVIEW_CONTENT = DEFAULT_OVERVIEW_CONTENT_INTERNAL;

export function createDefaultRegistries(): SessionRegistries {
	return createFrozenRegistries();
}

export function createDefaultRegistryMetadata(): SessionSnapshotMetadata {
	return cloneAndFreeze(SNAPSHOT.metadata);
}

export function createDefaultTriggerMetadata(): SessionSnapshotMetadata['triggers'] {
	return cloneAndFreeze(DEFAULT_TRIGGER_METADATA_INTERNAL);
}

export function createDefaultAssetMetadata(): SessionSnapshotMetadata['assets'] {
	return cloneAndFreeze(DEFAULT_ASSET_METADATA_INTERNAL);
}

export function createDefaultOverviewContent(): SessionSnapshotMetadata['overviewContent'] {
	return cloneAndFreeze(DEFAULT_OVERVIEW_CONTENT_INTERNAL);
}
