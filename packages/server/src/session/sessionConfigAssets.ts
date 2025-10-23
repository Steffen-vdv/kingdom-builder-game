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
        type StartConfig,
        type RuleSet,
        type SessionRegistriesPayload,
        type ResourceV2DefinitionConfig,
        type ResourceV2GroupDefinitionConfig,
        type SessionResourceRegistryPayload,
} from '@kingdom-builder/protocol';
import { type ActionCategoryConfig } from '@kingdom-builder/contents';
import type { ZodType } from 'zod';
import {
	buildSessionMetadata,
	type SessionStaticMetadataPayload,
} from './buildSessionMetadata.js';
import {
	cloneRegistry,
	freezeSerializedRegistry,
	buildResourceValueRegistryPayload,
} from './registryUtils.js';

export interface SessionBaseOptions {
	actions: Registry<ActionConfig>;
	actionCategories: Registry<ActionCategoryConfig>;
	buildings: Registry<BuildingConfig>;
	developments: Registry<DevelopmentConfig>;
	populations: Registry<PopulationConfig>;
	phases: PhaseConfig[];
	start: StartConfig;
	rules: RuleSet;
	resourceDefinitions: Iterable<ResourceV2DefinitionConfig>;
	resourceGroups: Iterable<ResourceV2GroupDefinitionConfig>;
}

interface OverrideContext {
	baseOptions: SessionBaseOptions;
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
	const resourceDefinitions = validated.resourcesV2?.definitions
		? validated.resourcesV2.definitions
		: context.baseOptions.resourceDefinitions;
	const resourceGroups = validated.resourcesV2?.groups
		? validated.resourcesV2.groups
		: context.baseOptions.resourceGroups;
	const resourceValues = buildResourceValueRegistryPayload({
		definitions: resourceDefinitions,
		groups: resourceGroups,
	});
	const registries: SessionRegistriesPayload = {
		actions: freezeSerializedRegistry(cloneRegistry(actions)),
		buildings: freezeSerializedRegistry(cloneRegistry(buildings)),
		developments: freezeSerializedRegistry(cloneRegistry(developments)),
		populations: freezeSerializedRegistry(cloneRegistry(populations)),
		resourceValues,
	} satisfies SessionRegistriesPayload;
	if (context.baseRegistries.actionCategories) {
		registries.actionCategories = context.baseRegistries.actionCategories;
	}
	const metadata = buildSessionMetadata({
		buildings,
		developments,
		resourceValues,
		phases,
	});
	return { registries, metadata };
}

export function buildResourceValueRegistry(
	overrides: SessionResourceRegistryPayload | undefined,
	baseDefinitions: Iterable<ResourceV2DefinitionConfig>,
	baseGroups: Iterable<ResourceV2GroupDefinitionConfig>,
): SessionResourceRegistryPayload {
	if (!overrides) {
		return buildResourceValueRegistryPayload({
			definitions: baseDefinitions,
			groups: baseGroups,
		});
	}
	return buildResourceValueRegistryPayload({
		definitions: overrides.definitions
			? Object.values(overrides.definitions)
			: baseDefinitions,
		groups: overrides.groups ? Object.values(overrides.groups) : baseGroups,
	});
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
