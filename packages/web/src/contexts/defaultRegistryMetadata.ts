import {
	createActionRegistry,
	createBuildingRegistry,
	createDevelopmentRegistry,
	createPopulationRegistry,
} from '@kingdom-builder/contents';
import type {
	SessionResourceDefinition,
	SessionSnapshotMetadata,
} from '@kingdom-builder/protocol/session';
import type { SessionRegistries } from '../state/sessionRegistries';
import snapshot from './defaultRegistryMetadata.json' with { type: 'json' };

interface DefaultRegistryMetadataSnapshot {
	metadata: SessionSnapshotMetadata;
	resources: Record<string, SessionResourceDefinition>;
}

const cloneAndFreeze = <TValue>(value: TValue): TValue => {
	if (Array.isArray(value)) {
		return Object.freeze(value.map(cloneAndFreeze)) as TValue;
	}
	if (value && typeof value === 'object') {
		const entries = Object.entries(value as Record<string, unknown>).map(
			([key, entry]) => [key, cloneAndFreeze(entry)],
		);
		return Object.freeze(Object.fromEntries(entries)) as TValue;
	}
	return value;
};

const snapshotPayload = snapshot as DefaultRegistryMetadataSnapshot;

const DEFAULT_RESOURCE_DEFINITIONS: Readonly<
	Record<string, SessionResourceDefinition>
> = cloneAndFreeze(snapshotPayload.resources);

const DEFAULT_REGISTRY_METADATA_INTERNAL: SessionSnapshotMetadata =
	cloneAndFreeze(snapshotPayload.metadata);

function createRegistries(): SessionRegistries {
	return Object.freeze({
		actions: createActionRegistry(),
		buildings: createBuildingRegistry(),
		developments: createDevelopmentRegistry(),
		populations: createPopulationRegistry(),
		resources: DEFAULT_RESOURCE_DEFINITIONS,
	}) as SessionRegistries;
}

export const DEFAULT_REGISTRIES: SessionRegistries = createRegistries();

export const DEFAULT_REGISTRY_METADATA: SessionSnapshotMetadata =
	DEFAULT_REGISTRY_METADATA_INTERNAL;
