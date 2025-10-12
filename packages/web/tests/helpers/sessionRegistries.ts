import type {
	SessionRegistriesPayload,
	SessionResourceDefinition,
	SessionRegistriesMetadata,
} from '@kingdom-builder/protocol/session';
import {
	deserializeSessionRegistries,
	type SessionRegistries,
} from '../../src/state/sessionRegistries';
import registriesPayload from '../fixtures/sessionRegistriesPayload.json';
import defaultMetadataSnapshot from '../../src/contexts/defaultRegistryMetadata.json';

const DEFAULT_METADATA = (
	defaultMetadataSnapshot as {
		metadata: SessionRegistriesMetadata;
	}
).metadata;

type RegistriesPayloadShape = Omit<SessionRegistriesPayload, 'metadata'> & {
	metadata?: SessionRegistriesMetadata;
};

const BASE_PAYLOAD = registriesPayload as RegistriesPayloadShape;
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
	payload: RegistriesPayloadShape,
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
		metadata: structuredClone(payload.metadata ?? DEFAULT_METADATA),
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
