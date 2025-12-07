import {
	Registry,
	actionCategorySchema,
	actionSchema,
	buildingSchema,
	developmentSchema,
	populationSchema,
	type ActionCategoryConfig,
	type ActionConfig,
	type BuildingConfig,
	type DevelopmentConfig,
	type PopulationConfig,
	type ResourceDefinition,
} from '@kingdom-builder/protocol';
import type { SessionRegistriesPayload } from '@kingdom-builder/protocol/session';
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

function cloneResourceRegistry(
	resources: Record<string, ResourceDefinition>,
): Record<string, ResourceDefinition> {
	return Object.fromEntries(
		Object.entries(resources).map(([key, definition]) => [
			key,
			clone(definition),
		]),
	);
}

function cloneActionCategoryDefinition(
	definition: ActionCategoryConfig,
): ActionCategoryConfig {
	const parsed = actionCategorySchema.passthrough().parse(definition);
	const clone: ActionCategoryConfig = {
		id: parsed.id,
		title: parsed.title,
		subtitle: parsed.subtitle ?? parsed.title,
		icon: parsed.icon,
		order: parsed.order,
		layout: parsed.layout,
		hideWhenEmpty: parsed.hideWhenEmpty ?? false,
	};
	if (parsed.description !== undefined) {
		clone.description = parsed.description;
	}
	if (parsed.analyticsKey !== undefined) {
		clone.analyticsKey = parsed.analyticsKey;
	}
	return clone;
}

function createActionCategoryRegistry(
	categories: Record<string, ActionCategoryConfig> | undefined,
): Registry<ActionCategoryConfig> {
	const registry = new Registry<ActionCategoryConfig>(
		actionCategorySchema.passthrough(),
	);
	if (!categories) {
		return registry;
	}
	for (const [id, definition] of Object.entries(categories)) {
		registry.add(id, cloneActionCategoryDefinition(definition));
	}
	return registry;
}

export interface SessionRegistries {
	actions: Registry<ActionConfig>;
	actionCategories: Registry<ActionCategoryConfig>;
	buildings: Registry<BuildingConfig>;
	developments: Registry<DevelopmentConfig>;
	populations: Registry<PopulationConfig>;
	resources: Record<string, ResourceDefinition>;
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
		actionCategories: createActionCategoryRegistry(payload.actionCategories),
	};
}

export function extractResourceKeys(registries: SessionRegistries): string[] {
	return Object.keys(registries.resources);
}
