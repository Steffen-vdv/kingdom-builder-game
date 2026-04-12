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
	type SessionActionCategoryRegistry,
	type SessionActionMetaCategoryRegistry,
} from '@boardsmith/protocol';
import { type ActionCategoryConfig } from '@boardsmith/contents';
import type { ZodType } from 'zod';
import {
	buildSessionMetadata,
	type SessionStaticMetadataPayload,
} from './buildSessionMetadata.js';
import {
	cloneActionCategoryRegistry,
	cloneRegistry,
	freezeSerializedRegistry,
} from './registryUtils.js';
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
}

export function buildSessionAssets(
	context: OverrideContext,
	config: GameConfig | undefined,
): {
	registries: SessionRegistriesPayload;
	metadata: SessionStaticMetadataPayload;
} {
	const validated = config ? validateGameConfig(config) : undefined;
	const { actions, buildings, developments } = validated
		? applyConfigRegistries(validated, context.baseOptions)
		: {
				actions: context.baseOptions.actions,
				buildings: context.baseOptions.buildings,
				developments: context.baseOptions.developments,
			};
	const phases = validated?.phases ?? context.baseOptions.phases;
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
	const actionCats = cloneActionCategoryRegistry(
		context.baseOptions.actionCategories,
	);
	if (Object.keys(actionCats).length > 0) {
		registries.actionCategories = freezeSerializedRegistry(
			actionCats,
		) as SessionActionCategoryRegistry;
	}
	const actionMetaCats = cloneRegistry(
		context.baseOptions.actionMetaCategories,
	);
	if (Object.keys(actionMetaCats).length > 0) {
		registries.actionMetaCategories = freezeSerializedRegistry(
			actionMetaCats,
		) as SessionActionMetaCategoryRegistry;
	}
	const metadata = buildSessionMetadata({
		buildings,
		developments,
		resources,
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
