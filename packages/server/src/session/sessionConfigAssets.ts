import {
	Registry,
	actionSchema,
	buildingSchema,
	developmentSchema,
	validateGameConfig,
	type ActionConfig,
	type ActionMetaCategoryConfig,
	type BuildingConfig,
	type DevelopmentConfig,
	type GameConfig,
	type PhaseConfig,
	type RuleSet,
	type SessionRegistriesPayload,
	type ResourceDefinition,
	type SerializedRegistry,
} from '@boardsmith/protocol';
import { type ActionCategoryConfig } from '@boardsmith/contents';
import type { ZodType } from 'zod';
import {
	buildSessionMetadata,
	type SessionStaticMetadataPayload,
} from './buildSessionMetadata.js';
import { cloneRegistry, freezeSerializedRegistry } from './registryUtils.js';
import type { RuntimeResourceContent } from '@boardsmith/engine';

export type SessionResourceRegistry = SerializedRegistry<ResourceDefinition>;

export interface SessionBaseOptions {
	actions: Registry<ActionConfig>;
	actionMetaCategories: Registry<ActionMetaCategoryConfig>;
	actionCategories: Registry<ActionCategoryConfig>;
	buildings: Registry<BuildingConfig>;
	developments: Registry<DevelopmentConfig>;
	phases: PhaseConfig[];
	rules: RuleSet;
	resourceCatalog: RuntimeResourceContent;
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
	const { actions, buildings, developments } = applyConfigRegistries(
		validated,
		context.baseOptions,
	);
	const phases = validated.phases ?? context.baseOptions.phases;
	const resourceCatalog = context.baseOptions.resourceCatalog;
	const resources = freezeSerializedRegistry(
		structuredClone(resourceCatalog.resources.byId),
	);
	const resourceGroups = freezeSerializedRegistry(
		structuredClone(resourceCatalog.groups.byId),
	);
	const resourceCategories = freezeSerializedRegistry(
		structuredClone(resourceCatalog.categories?.byId ?? {}),
	);
	const registries: SessionRegistriesPayload = {
		actions: freezeSerializedRegistry(cloneRegistry(actions)),
		buildings: freezeSerializedRegistry(cloneRegistry(buildings)),
		developments: freezeSerializedRegistry(cloneRegistry(developments)),
		resources,
		resourceGroups,
		resourceCategories,
	};
	if (context.baseRegistries.actionCategories) {
		registries.actionCategories = context.baseRegistries.actionCategories;
	}
	if (context.baseRegistries.actionMetaCategories) {
		registries.actionMetaCategories =
			context.baseRegistries.actionMetaCategories;
	}
	const metadata = buildSessionMetadata({
		buildings,
		developments,
		resources,
		phases,
	});
	return { registries, metadata };
}

/**
 * @deprecated Use resourceCatalog.resources.byId directly.
 * Kept temporarily for test compatibility.
 */
export function buildResourceRegistry(
	overrides: SessionResourceRegistry | undefined,
): SessionResourceRegistry {
	const registry = new Map<string, ResourceDefinition>();

	// Apply any overrides first
	if (overrides) {
		for (const [key, definition] of Object.entries(overrides)) {
			registry.set(key, structuredClone(definition));
		}
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
} {
	let actions = baseOptions.actions;
	let buildings = baseOptions.buildings;
	let developments = baseOptions.developments;
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
	return { actions, buildings, developments };
}
