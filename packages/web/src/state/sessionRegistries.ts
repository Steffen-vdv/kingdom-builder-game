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
} from '@kingdom-builder/protocol';
import type {
	SessionRegistriesPayload,
	SessionResourceDefinition,
} from '@kingdom-builder/protocol/session';
import type {
	ResourceV2Definition,
	ResourceV2GroupDefinition,
} from '@kingdom-builder/protocol/resource-v2';
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

export interface SessionRegistries {
	actions: Registry<ActionConfig>;
	actionCategories: Registry<ActionCategoryConfig>;
	buildings: Registry<BuildingConfig>;
	developments: Registry<DevelopmentConfig>;
	populations: Registry<PopulationConfig>;
	resources: Record<string, SessionResourceDefinition>;
	resourcesV2: Record<string, ResourceV2Definition>;
	resourceGroupsV2: Record<string, ResourceV2GroupDefinition>;
}

function cloneResourceV2Definition(
	definition: ResourceV2Definition,
): ResourceV2Definition {
	const cloned: ResourceV2Definition = {
		id: definition.id,
		label: definition.label,
		icon: definition.icon,
	};
	if (definition.description !== undefined) {
		cloned.description = definition.description;
	}
	if (definition.order !== undefined) {
		cloned.order = definition.order;
	}
	if (definition.tags && definition.tags.length > 0) {
		cloned.tags = [...definition.tags];
	}
	if (definition.lowerBound !== undefined) {
		cloned.lowerBound = definition.lowerBound;
	}
	if (definition.upperBound !== undefined) {
		cloned.upperBound = definition.upperBound;
	}
	if (definition.displayAsPercent !== undefined) {
		cloned.displayAsPercent = definition.displayAsPercent;
	}
	if (definition.trackValueBreakdown !== undefined) {
		cloned.trackValueBreakdown = definition.trackValueBreakdown;
	}
	if (definition.trackBoundBreakdown !== undefined) {
		cloned.trackBoundBreakdown = definition.trackBoundBreakdown;
	}
	if (definition.groupId !== undefined) {
		cloned.groupId = definition.groupId;
	}
	if (definition.groupOrder !== undefined) {
		cloned.groupOrder = definition.groupOrder;
	}
	if (definition.globalCost) {
		cloned.globalCost = { amount: definition.globalCost.amount };
	}
	if (definition.tierTrack) {
		cloned.tierTrack = clone(definition.tierTrack);
	}
	return cloned;
}

function cloneResourceGroupDefinition(
	definition: ResourceV2GroupDefinition,
): ResourceV2GroupDefinition {
	const cloned: ResourceV2GroupDefinition = { id: definition.id };
	if (definition.order !== undefined) {
		cloned.order = definition.order;
	}
	if (definition.parent) {
		cloned.parent = clone(definition.parent);
	}
	return cloned;
}

function cloneResourceV2Registry(
	resources: Record<string, ResourceV2Definition>,
): Record<string, ResourceV2Definition> {
	return Object.fromEntries(
		Object.entries(resources).map(([id, definition]) => [
			id,
			cloneResourceV2Definition(definition),
		]),
	);
}

function cloneResourceGroupRegistry(
	groups: Record<string, ResourceV2GroupDefinition>,
): Record<string, ResourceV2GroupDefinition> {
	return Object.fromEntries(
		Object.entries(groups).map(([id, definition]) => [
			id,
			cloneResourceGroupDefinition(definition),
		]),
	);
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
		resourcesV2: cloneResourceV2Registry(payload.resourcesV2 ?? {}),
		resourceGroupsV2: cloneResourceGroupRegistry(
			payload.resourceGroupsV2 ?? {},
		),
		actionCategories: createActionCategoryRegistry(payload.actionCategories),
	};
}

export function extractResourceKeys(registries: SessionRegistries): string[] {
	return Object.keys(registries.resources);
}
