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
	type ResourceV2Definition,
	type ResourceV2GroupDefinition,
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

function cloneResourceV2Definitions(
	definitions: ReadonlyArray<ResourceV2Definition> | undefined,
): ReadonlyArray<ResourceV2Definition> {
	if (!definitions || definitions.length === 0) {
		return Object.freeze([]);
	}
	const cloned = definitions.map((definition) => {
		const copy = structuredClone(definition);
		return Object.freeze(copy);
	});
	return Object.freeze(cloned);
}

function cloneResourceV2Groups(
	groups: ReadonlyArray<ResourceV2GroupDefinition> | undefined,
): ReadonlyArray<ResourceV2GroupDefinition> {
	if (!groups || groups.length === 0) {
		return Object.freeze([]);
	}
	const cloned = groups.map((group) => {
		const copy = structuredClone(group);
		return Object.freeze(copy);
	});
	return Object.freeze(cloned);
}

export interface SessionRegistries {
	actions: Registry<ActionConfig>;
	actionCategories: Registry<ActionCategoryConfig>;
	buildings: Registry<BuildingConfig>;
	developments: Registry<DevelopmentConfig>;
	populations: Registry<PopulationConfig>;
	resources: Record<string, SessionResourceDefinition>;
	resourceDefinitions: ReadonlyArray<ResourceV2Definition>;
	resourceGroups: ReadonlyArray<ResourceV2GroupDefinition>;
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
		resourceDefinitions: cloneResourceV2Definitions(
			payload.resourceDefinitions,
		),
		resourceGroups: cloneResourceV2Groups(payload.resourceGroups),
		actionCategories: createActionCategoryRegistry(payload.actionCategories),
	};
}

export function extractResourceKeys(registries: SessionRegistries): string[] {
	return Object.keys(registries.resources);
}
