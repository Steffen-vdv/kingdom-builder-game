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
} from '@kingdom-builder/protocol';
import type { ActionCategoryConfig } from '@kingdom-builder/contents';
import type { ZodType } from 'zod';
import {
	buildSessionMetadata,
	type SessionStaticMetadataPayload,
} from './buildSessionMetadata.js';
import {
	buildResourceRegistryPayload,
	cloneRegistry,
	freezeSerializedRegistry,
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
	resourceDefinitions: ReadonlyArray<ResourceV2DefinitionConfig>;
	resourceGroups: ReadonlyArray<ResourceV2GroupDefinitionConfig>;
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
	const resourceDefinitions = mergeResourceDefinitions(
		context.baseOptions.resourceDefinitions,
		validated.resourcesV2?.definitions,
	);
	const resourceGroups = mergeResourceGroups(
		context.baseOptions.resourceGroups,
		validated.resourcesV2?.groups,
	);
	/* eslint-disable @typescript-eslint/no-unsafe-assignment */
	const resourceValues = buildResourceRegistryPayload(
		resourceDefinitions,
		resourceGroups,
	);
	const registries = {
		actions: freezeSerializedRegistry(cloneRegistry(actions)),
		buildings: freezeSerializedRegistry(cloneRegistry(buildings)),
		developments: freezeSerializedRegistry(cloneRegistry(developments)),
		populations: freezeSerializedRegistry(cloneRegistry(populations)),
		resourceValues,
	} satisfies SessionRegistriesPayload;
	if (context.baseRegistries.actionCategories) {
		registries.actionCategories = context.baseRegistries.actionCategories;
	}
	/* eslint-enable @typescript-eslint/no-unsafe-assignment */
	const metadata = buildSessionMetadata({
		buildings,
		developments,
		resourceDefinitions,
		resourceGroups,
		phases,
	});
	return { registries, metadata };
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

function mergeResourceDefinitions(
	base: ReadonlyArray<ResourceV2DefinitionConfig>,
	overrides: ReadonlyArray<ResourceV2DefinitionConfig> | undefined,
): ResourceV2DefinitionConfig[] {
	const merged = new Map<string, ResourceV2DefinitionConfig>();
	for (const definition of base) {
		merged.set(definition.id, structuredClone(definition));
	}
	if (overrides) {
		for (const definition of overrides) {
			merged.set(definition.id, structuredClone(definition));
		}
	}
	return Array.from(merged.values());
}

function mergeResourceGroups(
	base: ReadonlyArray<ResourceV2GroupDefinitionConfig>,
	overrides: ReadonlyArray<ResourceV2GroupDefinitionConfig> | undefined,
): ResourceV2GroupDefinitionConfig[] {
	const merged = new Map<string, ResourceV2GroupDefinitionConfig>();
	for (const definition of base) {
		merged.set(definition.id, structuredClone(definition));
	}
	if (overrides) {
		for (const definition of overrides) {
			merged.set(definition.id, structuredClone(definition));
		}
	}
	return Array.from(merged.values());
}
