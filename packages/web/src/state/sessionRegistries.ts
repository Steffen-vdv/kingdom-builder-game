import {
	Registry,
	actionSchema,
	buildingSchema,
	developmentSchema,
	populationSchema,
	type ActionConfig,
	type BuildingConfig,
	type DevelopmentConfig,
	type PopulationConfig,
} from '@kingdom-builder/protocol';
import type {
	SessionRegistriesPayload,
	SessionResourceDefinition,
} from '@kingdom-builder/protocol/session';
import type { ZodType } from 'zod';
import { clone } from './clone';

function createRegistryFromPayload<DefinitionType>(
	entries: Record<string, DefinitionType>,
	schema: ZodType<DefinitionType>,
): Registry<DefinitionType> {
	const registry = new Registry<DefinitionType>(schema);
	for (const [id, definition] of Object.entries(entries)) {
		registry.add(id, clone(definition));
	}
	return registry;
}

function cloneResourceDefinition(
	definition: SessionResourceDefinition,
): SessionResourceDefinition {
	const cloned: SessionResourceDefinition = { key: definition.key };
	if (definition.icon !== undefined) {
		cloned.icon = definition.icon;
	}
	if (definition.label !== undefined) {
		cloned.label = definition.label;
	}
	if (definition.description !== undefined) {
		cloned.description = definition.description;
	}
	if (definition.tags && definition.tags.length > 0) {
		cloned.tags = [...definition.tags];
	}
	return cloned;
}

function cloneResourceRegistry(
	resources: Record<string, SessionResourceDefinition>,
): Record<string, SessionResourceDefinition> {
	return Object.fromEntries(
		Object.entries(resources).map(([key, definition]) => [
			key,
			cloneResourceDefinition(definition),
		]),
	);
}

export interface SessionRegistries {
	actions: Registry<ActionConfig>;
	buildings: Registry<BuildingConfig>;
	developments: Registry<DevelopmentConfig>;
	populations: Registry<PopulationConfig>;
	resources: Record<string, SessionResourceDefinition>;
}

export function deserializeSessionRegistries(
	payload: SessionRegistriesPayload,
): SessionRegistries {
	return {
		actions: createRegistryFromPayload(
			payload.actions ?? {},
			actionSchema.passthrough(),
		),
		buildings: createRegistryFromPayload(
			payload.buildings ?? {},
			buildingSchema.passthrough(),
		),
		developments: createRegistryFromPayload(
			payload.developments ?? {},
			developmentSchema.passthrough(),
		),
		populations: createRegistryFromPayload(
			payload.populations ?? {},
			populationSchema.passthrough(),
		),
		resources: cloneResourceRegistry(payload.resources ?? {}),
	};
}

export function extractResourceKeys(registries: SessionRegistries): string[] {
	return Object.keys(registries.resources);
}
