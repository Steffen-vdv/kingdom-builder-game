import {
	ACTIONS,
	BUILDINGS,
	DEVELOPMENTS,
	POPULATIONS,
	RESOURCES,
	type ResourceKey,
} from '@kingdom-builder/contents';
import type {
	SessionRegistriesPayload,
	SessionResourceDefinition,
} from '@kingdom-builder/protocol/session';
import {
	deserializeSessionRegistries,
	type SessionRegistries,
} from '../../src/state/sessionRegistries';

function cloneResourceDefinition(key: string): SessionResourceDefinition {
	const info = RESOURCES[key as ResourceKey];
	const definition: SessionResourceDefinition = { key };
	if (info?.icon !== undefined) {
		definition.icon = info.icon;
	}
	if (info?.label !== undefined) {
		definition.label = info.label;
	}
	if (info?.description !== undefined) {
		definition.description = info.description;
	}
	if (info?.tags && info.tags.length > 0) {
		definition.tags = [...info.tags];
	}
	return definition;
}

const toSerialized = <DefinitionType>(registry: {
	entries(): [string, DefinitionType][];
}) => {
	return Object.fromEntries(
		registry
			.entries()
			.map(([id, definition]) => [id, structuredClone(definition)]),
	);
};

export function createSessionRegistriesPayload(): SessionRegistriesPayload {
	return {
		actions: toSerialized(ACTIONS),
		buildings: toSerialized(BUILDINGS),
		developments: toSerialized(DEVELOPMENTS),
		populations: toSerialized(POPULATIONS),
		resources: Object.fromEntries(
			Object.keys(RESOURCES).map((key) => [key, cloneResourceDefinition(key)]),
		),
	};
}

export function createSessionRegistries(): SessionRegistries {
	return deserializeSessionRegistries(createSessionRegistriesPayload());
}

export function createResourceKeys(): ResourceKey[] {
	return Object.keys(RESOURCES) as ResourceKey[];
}
