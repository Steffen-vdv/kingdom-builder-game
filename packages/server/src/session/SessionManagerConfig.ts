import {
	ACTIONS,
	ACTION_CATEGORIES,
	ACTION_META_CATEGORIES,
	BUILDINGS,
	DEVELOPMENTS,
	PHASES,
	RULES,
	PRIMARY_ICON_ID,
	RESOURCE_REGISTRY,
	RESOURCE_GROUP_REGISTRY,
	RESOURCE_CATEGORY_REGISTRY,
} from '@kingdom-builder/contents';
import type {
	SessionRegistriesPayload,
	PhaseConfig,
	RuleSet,
	SessionActionCategoryRegistry,
	SessionActionMetaCategoryRegistry,
	SerializedRegistry,
	ResourceDefinition,
	ResourceGroupDefinition,
	ResourceCategoryDefinition,
} from '@kingdom-builder/protocol';
import {
	buildSessionMetadata,
	type SessionStaticMetadataPayload,
} from './buildSessionMetadata.js';
import {
	cloneActionCategoryRegistry,
	cloneRegistry,
	freezeSerializedRegistry,
} from './registryUtils.js';
import type {
	SessionBaseOptions,
	SessionResourceRegistry,
} from './sessionConfigAssets.js';

export type SessionRuntimeConfig = {
	phases: PhaseConfig[];
	rules: RuleSet;
	primaryIconId: string | null;
	resources: SerializedRegistry<ResourceDefinition>;
	resourceGroups: SerializedRegistry<ResourceGroupDefinition>;
	resourceCategories: SerializedRegistry<ResourceCategoryDefinition>;
};

export type EngineSessionOverrideOptions = Partial<SessionBaseOptions> & {
	resourceRegistry?: SessionResourceRegistry;
	actionCategoryRegistry?: SessionActionCategoryRegistry;
	primaryIconId?: string | null;
};

export interface SessionManagerConfigResult {
	baseOptions: SessionBaseOptions;
	registries: SessionRegistriesPayload;
	metadata: SessionStaticMetadataPayload;
	resourceOverrides: SessionResourceRegistry | undefined;
	runtimeConfig: SessionRuntimeConfig;
}

export function buildSessionManagerConfig(
	engineOptions: EngineSessionOverrideOptions = {},
): SessionManagerConfigResult {
	const {
		resourceRegistry,
		actionCategoryRegistry,
		primaryIconId: primaryIconOverride,
		...engineOverrides
	} = engineOptions;

	const baseActionCategories =
		engineOverrides.actionCategories ?? ACTION_CATEGORIES;
	const baseOptions: SessionBaseOptions = {
		actions: engineOverrides.actions ?? ACTIONS,
		actionMetaCategories:
			engineOverrides.actionMetaCategories ?? ACTION_META_CATEGORIES,
		actionCategories: baseActionCategories,
		buildings: engineOverrides.buildings ?? BUILDINGS,
		developments: engineOverrides.developments ?? DEVELOPMENTS,
		phases: engineOverrides.phases ?? PHASES,
		rules: engineOverrides.rules ?? RULES,
		resourceCatalog: engineOverrides.resourceCatalog ?? {
			resources: RESOURCE_REGISTRY,
			groups: RESOURCE_GROUP_REGISTRY,
			categories: RESOURCE_CATEGORY_REGISTRY,
		},
	};

	const primaryIconId = primaryIconOverride ?? PRIMARY_ICON_ID ?? null;
	const resourceOverrides = resourceRegistry
		? freezeSerializedRegistry(structuredClone(resourceRegistry))
		: undefined;

	const resourceCatalog = baseOptions.resourceCatalog;
	const resources = freezeSerializedRegistry(
		structuredClone(resourceCatalog.resources.byId),
	);
	const resourceGroups = freezeSerializedRegistry(
		structuredClone(resourceCatalog.groups.byId),
	);
	const resourceCategories = freezeSerializedRegistry(
		structuredClone(resourceCatalog.categories?.byId ?? {}),
	);

	const actionCategories = actionCategoryRegistry
		? (freezeSerializedRegistry(
				structuredClone(actionCategoryRegistry),
			) as SessionActionCategoryRegistry)
		: (freezeSerializedRegistry(
				cloneActionCategoryRegistry(baseOptions.actionCategories),
			) as SessionActionCategoryRegistry);

	const actionMetaCategories = freezeSerializedRegistry(
		cloneRegistry(baseOptions.actionMetaCategories),
	) as SessionActionMetaCategoryRegistry;

	const registries: SessionRegistriesPayload = {
		actions: cloneRegistry(baseOptions.actions),
		actionCategories,
		actionMetaCategories,
		buildings: cloneRegistry(baseOptions.buildings),
		developments: cloneRegistry(baseOptions.developments),
		resources,
		resourceGroups,
		resourceCategories,
	};

	const metadata = buildSessionMetadata({
		buildings: baseOptions.buildings,
		developments: baseOptions.developments,
		resources,
		phases: baseOptions.phases,
	});

	const frozenPhases = Object.freeze(
		structuredClone(baseOptions.phases),
	) as unknown as PhaseConfig[];
	const frozenRules = Object.freeze(
		structuredClone(baseOptions.rules),
	) as unknown as RuleSet;
	const runtimeConfig: SessionRuntimeConfig = Object.freeze({
		phases: frozenPhases,
		rules: frozenRules,
		primaryIconId,
		resources,
		resourceGroups,
		resourceCategories,
	});

	return {
		baseOptions,
		registries,
		metadata,
		resourceOverrides,
		runtimeConfig,
	};
}
