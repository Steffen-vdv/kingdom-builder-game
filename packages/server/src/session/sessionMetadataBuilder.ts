import {
	BUILDINGS,
	DEVELOPMENTS,
	LAND_INFO,
	OVERVIEW_CONTENT,
	PASSIVE_INFO,
	PHASES,
	POPULATIONS,
	RESOURCES,
	SLOT_INFO,
	STATS,
	TRIGGER_INFO,
	createActionRegistry,
	createBuildingRegistry,
	createDevelopmentRegistry,
	createPopulationRegistry,
} from '@kingdom-builder/contents';
import type { OverviewContentTemplate } from '@kingdom-builder/contents';
import type {
	ActionConfig,
	BuildingConfig,
	DevelopmentConfig,
	PopulationConfig,
	Registry,
} from '@kingdom-builder/protocol';
import type {
	SessionRegistriesPayload,
	SessionResourceDefinition,
	SessionSnapshotMetadata,
	SessionMetadataDescriptor,
	SessionPhaseMetadata,
	SessionPhaseStepMetadata,
	SessionTriggerMetadata,
} from '@kingdom-builder/protocol/session';

type DescriptorRecord = Record<string, SessionMetadataDescriptor>;

type StatMetadataRecord = Record<
	string,
	SessionMetadataDescriptor & {
		displayAsPercent?: boolean;
		format?: { prefix?: string; percent?: boolean };
		capacity?: boolean;
	}
>;

export type SessionStaticMetadata = SessionSnapshotMetadata & {
	overviewContent: OverviewContentTemplate;
};

export interface SessionMetadataBuildResult {
	readonly registries: SessionRegistriesPayload;
	readonly metadata: SessionStaticMetadata;
}

const clone = <T>(value: T): T => {
	if (typeof structuredClone === 'function') {
		return structuredClone(value);
	}
	return JSON.parse(JSON.stringify(value)) as T;
};

const deepFreeze = <T>(value: T): T => {
	if (Array.isArray(value)) {
		for (const entry of value) {
			deepFreeze(entry);
		}
		return Object.freeze(value) as unknown as T;
	}
	if (value !== null && typeof value === 'object') {
		for (const entry of Object.values(value as Record<string, unknown>)) {
			deepFreeze(entry);
		}
		return Object.freeze(value);
	}
	return value;
};

const serializeRegistry = <DefinitionType extends { id?: string }>(
	registry: Registry<DefinitionType>,
): Record<string, DefinitionType> => {
	const serialized: Record<string, DefinitionType> = {};
	for (const [id, definition] of registry.entries()) {
		serialized[id] = clone(definition);
	}
	return serialized;
};

const createResourceDefinitions = (): Record<
	string,
	SessionResourceDefinition
> =>
	Object.fromEntries(
		Object.entries(RESOURCES).map(([key, info]) => {
			const entry: SessionResourceDefinition = { key };
			if (info.icon !== undefined) {
				entry.icon = info.icon;
			}
			if (info.label !== undefined) {
				entry.label = info.label;
			}
			if (info.description !== undefined) {
				entry.description = info.description;
			}
			if (info.tags && info.tags.length > 0) {
				entry.tags = [...info.tags];
			}
			return [key, entry];
		}),
	);

const createDescriptor = (
	label?: string,
	icon?: string,
	description?: string,
): SessionMetadataDescriptor => {
	const descriptor: SessionMetadataDescriptor = {};
	if (label !== undefined) {
		descriptor.label = label;
	}
	if (icon !== undefined) {
		descriptor.icon = icon;
	}
	if (description !== undefined) {
		descriptor.description = description;
	}
	return descriptor;
};

const createRegistryDescriptorMap = <DefinitionType extends { id?: string }>(
	registry: Registry<DefinitionType>,
): DescriptorRecord => {
	const descriptors: DescriptorRecord = {};
	for (const [id, definition] of registry.entries()) {
		const descriptor = createDescriptor(
			(definition as { name?: string }).name,
			(definition as { icon?: string }).icon,
			(definition as { description?: string }).description,
		);
		descriptors[id] = descriptor;
	}
	return descriptors;
};

const createResourceMetadata = (): DescriptorRecord =>
	Object.fromEntries(
		Object.entries(RESOURCES).map(([key, info]) => [
			key,
			createDescriptor(info.label, info.icon, info.description),
		]),
	);

const createStatMetadata = (): StatMetadataRecord => {
	const entries: StatMetadataRecord = {};
	for (const [key, info] of Object.entries(STATS)) {
		const descriptor = createDescriptor(
			info.label,
			info.icon,
			info.description,
		) as StatMetadataRecord[string];
		if (info.displayAsPercent !== undefined) {
			descriptor.displayAsPercent = info.displayAsPercent;
		}
		if (info.addFormat) {
			descriptor.format = clone(info.addFormat);
		}
		if (info.capacity !== undefined) {
			descriptor.capacity = info.capacity;
		}
		entries[key] = descriptor;
	}
	return entries;
};

const createPhaseStepMetadata = (
	step: (typeof PHASES)[number]['steps'][number],
): SessionPhaseStepMetadata => {
	const metadata: SessionPhaseStepMetadata = { id: step.id };
	if (step.title !== undefined) {
		metadata.label = step.title;
	}
	if (step.icon !== undefined) {
		metadata.icon = step.icon;
	}
	if (step.triggers && step.triggers.length > 0) {
		metadata.triggers = [...step.triggers];
	}
	return metadata;
};

const createPhaseMetadata = (): Record<string, SessionPhaseMetadata> =>
	Object.fromEntries(
		PHASES.map((phase) => {
			const metadata: SessionPhaseMetadata = { id: phase.id };
			if (phase.label !== undefined) {
				metadata.label = phase.label;
			}
			if (phase.icon !== undefined) {
				metadata.icon = phase.icon;
			}
			if (phase.action !== undefined) {
				metadata.action = phase.action;
			}
			if (phase.steps && phase.steps.length > 0) {
				metadata.steps = phase.steps.map(createPhaseStepMetadata);
			}
			return [phase.id, metadata];
		}),
	);

const createTriggerMetadata = (): Record<string, SessionTriggerMetadata> =>
	Object.fromEntries(
		Object.entries(TRIGGER_INFO).map(([key, info]) => [
			key,
			{
				label: info.past,
				icon: info.icon,
				future: info.future,
				past: info.past,
			},
		]),
	);

const createAssetMetadata = (): DescriptorRecord => ({
	land: createDescriptor(LAND_INFO.label, LAND_INFO.icon),
	slot: createDescriptor(SLOT_INFO.label, SLOT_INFO.icon),
	passive: createDescriptor(PASSIVE_INFO.label, PASSIVE_INFO.icon),
});

const buildRegistries = (): SessionRegistriesPayload => {
	const actionRegistry = createActionRegistry();
	const buildingRegistry = createBuildingRegistry();
	const developmentRegistry = createDevelopmentRegistry();
	const populationRegistry = createPopulationRegistry();
	const registries: SessionRegistriesPayload = {
		actions: serializeRegistry<ActionConfig>(actionRegistry),
		buildings: serializeRegistry<BuildingConfig>(buildingRegistry),
		developments: serializeRegistry<DevelopmentConfig>(developmentRegistry),
		populations: serializeRegistry<PopulationConfig>(populationRegistry),
		resources: createResourceDefinitions(),
	};
	return deepFreeze(registries);
};

const buildMetadata = (): SessionStaticMetadata => {
	const metadata: SessionStaticMetadata = {
		passiveEvaluationModifiers: Object.freeze({}),
		resources: createResourceMetadata(),
		populations: createRegistryDescriptorMap<PopulationConfig>(POPULATIONS),
		buildings: createRegistryDescriptorMap<BuildingConfig>(BUILDINGS),
		developments: createRegistryDescriptorMap<DevelopmentConfig>(DEVELOPMENTS),
		stats: createStatMetadata(),
		phases: createPhaseMetadata(),
		triggers: createTriggerMetadata(),
		assets: createAssetMetadata(),
		overviewContent: clone(OVERVIEW_CONTENT),
	};
	return deepFreeze(metadata);
};

export const buildSessionMetadata = (): SessionMetadataBuildResult => ({
	registries: buildRegistries(),
	metadata: buildMetadata(),
});
