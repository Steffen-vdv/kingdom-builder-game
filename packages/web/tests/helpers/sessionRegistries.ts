import type {
	SessionRegistriesPayload,
	SessionResourceDefinition,
	SessionSnapshotMetadata,
} from '@kingdom-builder/protocol/session';
import {
	deserializeSessionRegistries,
	type SessionRegistries,
} from '../../src/state/sessionRegistries';
import type { OverviewContentTemplate } from '../../src/components/overview/overviewContentTypes';
import snapshot from '../../src/contexts/defaultRegistryMetadata.json';

interface DefaultRegistrySnapshot {
	readonly registries: SessionRegistriesPayload;
	readonly metadata: SessionSnapshotMetadata;
	readonly overviewContent: OverviewContentTemplate;
}

const BASE_SNAPSHOT = snapshot as DefaultRegistrySnapshot;
const BASE_PAYLOAD = BASE_SNAPSHOT.registries;
const BASE_METADATA = BASE_SNAPSHOT.metadata;
const BASE_OVERVIEW_CONTENT = BASE_SNAPSHOT.overviewContent;
type ResourceKey = SessionResourceDefinition['key'];

function cloneResourceDefinition(
	definition: SessionResourceDefinition,
): SessionResourceDefinition {
	const clone: SessionResourceDefinition = { key: definition.key };
	if (definition.icon !== undefined) {
		clone.icon = definition.icon;
	}
	if (definition.label !== undefined) {
		clone.label = definition.label;
	}
	if (definition.description !== undefined) {
		clone.description = definition.description;
	}
	if (definition.tags && definition.tags.length > 0) {
		clone.tags = [...definition.tags];
	}
	return clone;
}

function cloneRegistriesPayload(
	payload: SessionRegistriesPayload,
): SessionRegistriesPayload {
	const cloneEntries = <T>(entries: Record<string, T> | undefined) => {
		if (!entries) {
			return {};
		}
		return Object.fromEntries(
			Object.entries(entries).map(([id, definition]) => [
				id,
				structuredClone(definition),
			]),
		);
	};
	return {
		actions: cloneEntries(payload.actions),
		buildings: cloneEntries(payload.buildings),
		developments: cloneEntries(payload.developments),
		populations: cloneEntries(payload.populations),
		resources: Object.fromEntries(
			Object.entries(payload.resources ?? {}).map(([key, definition]) => [
				key,
				cloneResourceDefinition(definition),
			]),
		),
	};
}

export function createSessionRegistriesPayload(): SessionRegistriesPayload {
	return cloneRegistriesPayload(BASE_PAYLOAD);
}

export function createSessionRegistries(): SessionRegistries {
	return deserializeSessionRegistries(createSessionRegistriesPayload());
}

export function createResourceKeys(): ResourceKey[] {
	return Object.keys(BASE_PAYLOAD.resources ?? {}) as ResourceKey[];
}

function cloneSnapshot<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}

export function createDefaultRegistryMetadata(): SessionSnapshotMetadata {
	return cloneSnapshot(BASE_METADATA);
}

export function createDefaultOverviewContent(): OverviewContentTemplate {
	return cloneSnapshot(BASE_OVERVIEW_CONTENT);
}
