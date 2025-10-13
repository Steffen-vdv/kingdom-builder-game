import type {
	SessionRegistriesPayload,
	SessionSnapshotMetadata,
} from '@kingdom-builder/protocol/session';
import type { OverviewContentTemplate } from '@kingdom-builder/contents';
import { deserializeSessionRegistries } from '../state/sessionRegistries';
import type { SessionRegistries } from '../state/sessionRegistries';
import snapshot from './defaultRegistryMetadata.json';

interface DefaultRegistrySnapshot {
	readonly registries: SessionRegistriesPayload;
	readonly metadata: SessionSnapshotMetadata;
	readonly overviewContent: OverviewContentTemplate;
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

const DEFAULT_REGISTRIES_INTERNAL = freezeRegistries(
	deserializeSessionRegistries(SNAPSHOT.registries),
);

export const DEFAULT_REGISTRIES: SessionRegistries =
	DEFAULT_REGISTRIES_INTERNAL;

export const DEFAULT_REGISTRY_METADATA: SessionSnapshotMetadata =
	SNAPSHOT.metadata;

export const DEFAULT_OVERVIEW_CONTENT: OverviewContentTemplate =
	SNAPSHOT.overviewContent;
