import {
	Registry,
	actionSchema,
	buildingSchema,
	developmentSchema,
	populationSchema,
	validateGameConfig,
	type ActionConfig,
	type BuildingConfig,
	type DevelopmentConfig,
	type PopulationConfig,
	type GameConfig,
	type PhaseConfig,
	type RuleSet,
	type SessionRegistriesPayload,
	type SessionResourceDefinition,
	type SerializedRegistry,
} from '@kingdom-builder/protocol';
import {
	RESOURCE_V2_REGISTRY,
	type ActionCategoryConfig,
} from '@kingdom-builder/contents';
import type { ZodType } from 'zod';
import {
	buildSessionMetadata,
	type SessionStaticMetadataPayload,
} from './buildSessionMetadata.js';
import { cloneRegistry, freezeSerializedRegistry } from './registryUtils.js';
import type { RuntimeResourceContent } from '@kingdom-builder/engine';

export type SessionResourceRegistry =
	SerializedRegistry<SessionResourceDefinition>;

export interface SessionBaseOptions {
	actions: Registry<ActionConfig>;
	actionCategories: Registry<ActionCategoryConfig>;
	buildings: Registry<BuildingConfig>;
	developments: Registry<DevelopmentConfig>;
	populations: Registry<PopulationConfig>;
	phases: PhaseConfig[];
	rules: RuleSet;
	resourceCatalogV2: RuntimeResourceContent;
}

interface OverrideContext {
	baseOptions: SessionBaseOptions;
	resourceOverrides: SessionResourceRegistry | undefined;
	baseRegistries: SessionRegistriesPayload;
	baseMetadata: SessionStaticMetadataPayload;
}

export function buildSessionAssets(
	context: OverrideContext,
	config: GameConfig | undefined,
): {
	registries: SessionRegistriesPayload;
	metadata: SessionStaticMetadataPayload;
} {
	if (!config) {
		return {
			registries: context.baseRegistries,
			metadata: context.baseMetadata,
		};
	}
	const validated = validateGameConfig(config);
	const { actions, buildings, developments, populations } =
		applyConfigRegistries(validated, context.baseOptions);
	const phases = validated.phases ?? context.baseOptions.phases;
	const resources = buildResourceRegistry(context.resourceOverrides);
	const resourceCatalog = context.baseOptions.resourceCatalogV2;
	const resourcesV2 = freezeSerializedRegistry(
		structuredClone(resourceCatalog.resources.byId),
	);
	const resourceGroupsV2 = freezeSerializedRegistry(
		structuredClone(resourceCatalog.groups.byId),
	);
	const resourceCategoriesV2 = freezeSerializedRegistry(
		structuredClone(resourceCatalog.categories?.byId ?? {}),
	);
	const frozenResources = freezeSerializedRegistry(structuredClone(resources));
	const registries: SessionRegistriesPayload = {
		actions: freezeSerializedRegistry(cloneRegistry(actions)),
		buildings: freezeSerializedRegistry(cloneRegistry(buildings)),
		developments: freezeSerializedRegistry(cloneRegistry(developments)),
		populations: freezeSerializedRegistry(cloneRegistry(populations)),
		resources: frozenResources,
		resourcesV2,
		resourceGroupsV2,
		resourceCategoriesV2,
	};
	if (context.baseRegistries.actionCategories) {
		registries.actionCategories = context.baseRegistries.actionCategories;
	}
	const metadata = buildSessionMetadata({
		buildings,
		developments,
		populations,
		resources: frozenResources,
		phases,
	});
	return { registries, metadata };
}

export function buildResourceRegistry(
	overrides: SessionResourceRegistry | undefined,
): SessionResourceRegistry {
	const registry = new Map<string, SessionResourceDefinition>();

	// Apply any overrides first
	if (overrides) {
		for (const [key, definition] of Object.entries(overrides)) {
			registry.set(key, structuredClone(definition));
		}
	}

	// Add all resources from the V2 registry
	for (const [key, resource] of Object.entries(RESOURCE_V2_REGISTRY.byId)) {
		if (registry.has(key)) {
			continue;
		}
		const definition: SessionResourceDefinition = {
			key: resource.id,
			icon: resource.icon,
			label: resource.label,
		};
		if (resource.description) {
			definition.description = resource.description;
		}
		if (resource.tags && resource.tags.length > 0) {
			definition.tags = [...resource.tags];
		}
		registry.set(key, definition);
	}

	return Object.fromEntries(registry.entries());
}

function applyConfigRegistries(
	config: GameConfig,
	baseOptions: SessionBaseOptions,
): {
	actions: Registry<ActionConfig>;
	buildings: Registry<BuildingConfig>;
	developments: Registry<DevelopmentConfig>;
	populations: Registry<PopulationConfig>;
} {
	let actions = baseOptions.actions;
	let buildings = baseOptions.buildings;
	let developments = baseOptions.developments;
	let populations = baseOptions.populations;
	const overrideRegistry = <DefinitionType extends { id: string }>(
		definitions: DefinitionType[] | undefined,
		schema: ZodType<DefinitionType>,
		current: Registry<DefinitionType>,
	): Registry<DefinitionType> => {
		if (!definitions || definitions.length === 0) {
			return current;
		}
		const registry = new Registry<DefinitionType>(schema);
		for (const definition of definitions) {
			registry.add(definition.id, definition);
		}
		return registry;
	};
	actions = overrideRegistry(config.actions, actionSchema, actions);
	buildings = overrideRegistry(config.buildings, buildingSchema, buildings);
	developments = overrideRegistry(
		config.developments,
		developmentSchema,
		developments,
	);
	populations = overrideRegistry(
		config.populations,
		populationSchema,
		populations,
	);
	return { actions, buildings, developments, populations };
}
