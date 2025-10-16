import type {
	SessionRegistriesPayload,
	SessionSnapshotMetadata,
} from '@kingdom-builder/protocol/session';
import { deserializeSessionRegistries } from '../state/sessionRegistries';
import type { SessionRegistries } from '../state/sessionRegistries';
import snapshot from './defaultRegistryMetadata.json';

type SnapshotModule = typeof snapshot;

type SnapshotOverviewContent = SnapshotModule['metadata'] extends {
	overviewContent: infer OverviewContent;
}
	? OverviewContent
	: never;

type DefaultRegistryMetadata = SessionSnapshotMetadata & {
	readonly overviewContent: SnapshotOverviewContent;
};

export type { DefaultRegistryMetadata };
export type DefaultRegistryOverviewContent = SnapshotOverviewContent;

interface DefaultRegistrySnapshot {
	readonly registries: SessionRegistriesPayload;
	readonly metadata: DefaultRegistryMetadata;
}

/**
 * Recursively freezes arrays and plain objects so their contents become immutable.
 *
 * @param value - The value to freeze
 * @returns The same `value` reference with all nested objects and arrays frozen
 */
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

export const DEFAULT_REGISTRY_METADATA: DefaultRegistryMetadata =
	SNAPSHOT.metadata;

export const DEFAULT_REGISTRY_OVERVIEW_CONTENT: DefaultRegistryOverviewContent =
	SNAPSHOT.metadata.overviewContent;