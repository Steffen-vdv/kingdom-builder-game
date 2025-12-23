import {
	Registry,
	actionCategorySchema,
	actionMetaCategorySchema,
	actionSchema,
	buildingSchema,
	developmentSchema,
	type ActionCategoryConfig,
	type ActionConfig,
	type ActionMetaCategoryConfig,
	type BuildingConfig,
	type DevelopmentConfig,
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

function cloneActionMetaCategoryDefinition(
	definition: ActionMetaCategoryConfig,
): ActionMetaCategoryConfig {
	const parsed = actionMetaCategorySchema.passthrough().parse(definition);
	const result: ActionMetaCategoryConfig = {
		id: parsed.id,
		label: parsed.label,
		icon: parsed.icon,
		bindingResourceId: parsed.bindingResourceId,
		costModel: parsed.costModel,
		visibilityTrigger: parsed.visibilityTrigger,
		order: parsed.order,
	};
	if (parsed.globalCostAmount !== undefined) {
		result.globalCostAmount = parsed.globalCostAmount;
	}
	if (parsed.categoryIds !== undefined) {
		result.categoryIds = [...parsed.categoryIds];
	}
	return result;
}

function createActionMetaCategoryRegistry(
	metaCategories: Record<string, ActionMetaCategoryConfig> | undefined,
): Registry<ActionMetaCategoryConfig> {
	const registry = new Registry<ActionMetaCategoryConfig>(
		actionMetaCategorySchema.passthrough(),
	);
	if (!metaCategories) {
		return registry;
	}
	for (const [id, definition] of Object.entries(metaCategories)) {
		registry.add(id, cloneActionMetaCategoryDefinition(definition));
	}
	return registry;
}

export interface SessionRegistries {
	actions: Registry<ActionConfig>;
	actionCategories: Registry<ActionCategoryConfig>;
	actionMetaCategories: Registry<ActionMetaCategoryConfig>;
	buildings: Registry<BuildingConfig>;
	developments: Registry<DevelopmentConfig>;
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
		resources: cloneResourceRegistry(payload.resources ?? {}),
		actionCategories: createActionCategoryRegistry(payload.actionCategories),
		actionMetaCategories: createActionMetaCategoryRegistry(
			payload.actionMetaCategories,
		),
	};
}

export function extractResourceKeys(registries: SessionRegistries): string[] {
	return Object.keys(registries.resources);
}
