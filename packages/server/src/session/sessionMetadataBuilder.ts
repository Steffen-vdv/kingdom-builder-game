import {
	ACTIONS,
	ACTION_CATEGORIES,
	BUILDINGS,
	DEVELOPMENTS,
	PHASES,
	TRIGGER_META,
	LAND_INFO,
	SLOT_INFO,
	PASSIVE_INFO,
	POPULATION_INFO,
	DEVELOPMENTS_INFO,
	OVERVIEW_CONTENT,
	type OverviewContentTemplate,
} from '@kingdom-builder/contents';
import {
	RESOURCE_CATEGORY_REGISTRY,
	RESOURCE_GROUP_REGISTRY,
	RESOURCE_REGISTRY,
} from '@kingdom-builder/contents';
import type {
	Registry,
	SerializedRegistry,
	SessionRegistriesPayload,
	SessionActionCategoryRegistry,
} from '@kingdom-builder/protocol';
import type {
	SessionSnapshotMetadata,
	SessionMetadataDescriptor,
	SessionPhaseMetadata,
	SessionPhaseStepMetadata,
	SessionTriggerMetadata,
} from '@kingdom-builder/protocol/session';

type RegistryDefinition<T> = SerializedRegistry<T>;

type StaticSessionMetadata = Pick<
	SessionSnapshotMetadata,
	| 'resources'
	| 'resourceGroups'
	| 'buildings'
	| 'developments'
	| 'phases'
	| 'triggers'
	| 'assets'
>;

export interface SessionMetadataBuildResult {
	readonly registries: SessionRegistriesPayload;
	readonly metadata: StaticSessionMetadata;
	readonly overviewContent: OverviewContentTemplate;
}

const deepFreeze = <T>(value: T): T => {
	if (Array.isArray(value)) {
		for (const entry of value) {
			deepFreeze(entry);
		}
		return Object.freeze(value) as unknown as T;
	}
	if (value && typeof value === 'object') {
		for (const entry of Object.values(value as Record<string, unknown>)) {
			deepFreeze(entry);
		}
		return Object.freeze(value);
	}
	return value;
};

const cloneRegistry = <DefinitionType>(
	registry: Registry<DefinitionType>,
): RegistryDefinition<DefinitionType> => {
	const entries = registry.entries();
	const result: RegistryDefinition<DefinitionType> = {};
	for (const [id, definition] of entries) {
		result[id] = structuredClone(definition);
	}
	return deepFreeze(result);
};

const cloneActionCategoryRegistry = (): SessionActionCategoryRegistry => {
	const entries: SessionActionCategoryRegistry = {};
	for (const [id, definition] of ACTION_CATEGORIES.entries()) {
		const entry: SessionActionCategoryRegistry[string] = {
			id: definition.id,
			title: definition.label,
			subtitle: definition.subtitle ?? definition.label,
			icon: definition.icon,
			order: definition.order,
			layout: definition.layout,
		};
		if (definition.description) {
			entry.description = definition.description;
		}
		if (definition.hideWhenEmpty) {
			entry.hideWhenEmpty = definition.hideWhenEmpty;
		}
		if (definition.analyticsKey) {
			entry.analyticsKey = definition.analyticsKey;
		}
		entries[id] = deepFreeze(entry);
	}
	return deepFreeze(entries);
};

const cloneResourceCatalogRegistry = <DefinitionType>(registry: {
	byId: Record<string, DefinitionType>;
}): RegistryDefinition<DefinitionType> =>
	deepFreeze(
		structuredClone(registry.byId),
	) as RegistryDefinition<DefinitionType>;

const createMetadataRecord = <T>(entries: Iterable<readonly [string, T]>) => {
	const record: Record<string, T> = {};
	for (const [id, descriptor] of entries) {
		record[id] = deepFreeze(descriptor);
	}
	return deepFreeze(record);
};

const buildResourceMetadata = () =>
	createMetadataRecord(
		RESOURCE_REGISTRY.ordered.map((resource) => {
			const entry: SessionMetadataDescriptor = {
				label: resource.label,
				icon: resource.icon,
			};
			if (resource.description) {
				entry.description = resource.description;
			}
			if (resource.displayAsPercent) {
				entry.displayAsPercent = resource.displayAsPercent;
			}
			return [resource.id, entry] as const;
		}),
	);

const buildBuildingMetadata = () =>
	createMetadataRecord(
		BUILDINGS.entries().map(([id, definition]) => {
			const descriptor: SessionMetadataDescriptor = {
				label:
					typeof (definition as { name?: unknown })?.name === 'string'
						? (definition as { name: string }).name
						: id,
			};
			const icon = (definition as { icon?: unknown })?.icon;
			if (typeof icon === 'string') {
				descriptor.icon = icon;
			}
			const description = (definition as { description?: unknown })
				?.description;
			if (typeof description === 'string') {
				descriptor.description = description;
			}
			return [id, descriptor] as const;
		}),
	);

const buildDevelopmentMetadata = () =>
	createMetadataRecord(
		DEVELOPMENTS.entries().map(([id, definition]) => {
			const descriptor: SessionMetadataDescriptor = {
				label:
					typeof (definition as { name?: unknown })?.name === 'string'
						? (definition as { name: string }).name
						: id,
			};
			const icon = (definition as { icon?: unknown })?.icon;
			if (typeof icon === 'string') {
				descriptor.icon = icon;
			}
			const description = (definition as { description?: unknown })
				?.description;
			if (typeof description === 'string') {
				descriptor.description = description;
			}
			return [id, descriptor] as const;
		}),
	);

const toPhaseStepMetadata = (step: unknown): SessionPhaseStepMetadata => {
	const metadata: SessionPhaseStepMetadata = {
		id: (step as { id: string }).id,
	};
	const label = (step as { title?: unknown }).title;
	if (typeof label === 'string') {
		metadata.label = label;
	}
	const icon = (step as { icon?: unknown }).icon;
	if (typeof icon === 'string') {
		metadata.icon = icon;
	}
	const triggers = (step as { triggers?: unknown }).triggers;
	if (Array.isArray(triggers)) {
		metadata.triggers = triggers.map((trigger) => String(trigger));
	}
	return metadata;
};

const buildPhaseMetadata = () =>
	createMetadataRecord(
		PHASES.map((phase) => {
			const metadata: SessionPhaseMetadata = { id: phase.id };
			if (typeof phase.label === 'string') {
				metadata.label = phase.label;
			}
			if (typeof phase.icon === 'string') {
				metadata.icon = phase.icon;
			}
			if (typeof phase.action === 'boolean') {
				metadata.action = phase.action;
			}
			if (Array.isArray(phase.steps) && phase.steps.length > 0) {
				metadata.steps = phase.steps.map(toPhaseStepMetadata);
			}
			return [phase.id, metadata] as const;
		}),
	);

// Build a map from stepId to phase info for step trigger resolution
const buildStepToPhaseMap = (): Map<
	string,
	{ icon: string; label: string }
> => {
	const map = new Map<string, { icon: string; label: string }>();
	for (const phase of PHASES) {
		for (const step of phase.steps ?? []) {
			map.set(step.id, {
				icon: phase.icon ?? '',
				label: phase.label ?? phase.id,
			});
		}
	}
	return map;
};

const buildTriggerMetadata = () => {
	const stepToPhase = buildStepToPhaseMap();

	return createMetadataRecord(
		Object.entries(TRIGGER_META).map(([triggerId, meta]) => {
			const descriptor: SessionTriggerMetadata = { label: meta.label };

			if (meta.type === 'step') {
				// Step trigger: derive icon and text from phase
				const phaseInfo = stepToPhase.get(meta.stepId);
				if (phaseInfo) {
					descriptor.icon = phaseInfo.icon;
					descriptor.text = `On your ${phaseInfo.icon} ${phaseInfo.label} Phase`;
				}
			} else {
				// Event trigger: pass through icon, text, and condition
				descriptor.icon = meta.icon;
				descriptor.text = meta.text;
				if (meta.condition) {
					descriptor.condition = meta.condition;
				}
			}

			return [triggerId, descriptor] as const;
		}),
	);
};

const buildAssetMetadata = () =>
	createMetadataRecord([
		[
			'population',
			{ label: POPULATION_INFO.label, icon: POPULATION_INFO.icon },
		],
		['land', { label: LAND_INFO.label, icon: LAND_INFO.icon }],
		['slot', { label: SLOT_INFO.label, icon: SLOT_INFO.icon }],
		['passive', { label: PASSIVE_INFO.label, icon: PASSIVE_INFO.icon }],
		[
			'developments',
			{
				label: DEVELOPMENTS_INFO.label,
				icon: DEVELOPMENTS_INFO.icon,
			},
		],
	]);

const cloneOverviewContent = () =>
	deepFreeze(structuredClone(OVERVIEW_CONTENT));

export const buildSessionMetadata = (): SessionMetadataBuildResult => {
	const registries: SessionRegistriesPayload = {
		actions: cloneRegistry(ACTIONS),
		actionCategories: cloneActionCategoryRegistry(),
		buildings: cloneRegistry(BUILDINGS),
		developments: cloneRegistry(DEVELOPMENTS),
		resources: cloneResourceCatalogRegistry(RESOURCE_REGISTRY),
		resourceGroups: cloneResourceCatalogRegistry(RESOURCE_GROUP_REGISTRY),
		resourceCategories: cloneResourceCatalogRegistry(
			RESOURCE_CATEGORY_REGISTRY,
		),
	};
	const metadata: StaticSessionMetadata = {
		resources: buildResourceMetadata(),
		buildings: buildBuildingMetadata(),
		developments: buildDevelopmentMetadata(),
		phases: buildPhaseMetadata(),
		triggers: buildTriggerMetadata(),
		assets: buildAssetMetadata(),
	};
	return Object.freeze({
		registries,
		metadata,
		overviewContent: cloneOverviewContent(),
	});
};
