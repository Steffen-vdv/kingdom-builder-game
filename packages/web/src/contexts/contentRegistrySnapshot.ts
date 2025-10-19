import type {
	SessionMetadataDescriptor,
	SessionOverviewMetadata,
	SessionPhaseMetadata,
	SessionPhaseStepMetadata,
	SessionRegistriesPayload,
	SessionSnapshotMetadata,
	SessionTriggerMetadata,
	SessionResourceDefinition,
} from '@kingdom-builder/protocol/session';
import {
	createActionRegistry,
	createBuildingRegistry,
	createDevelopmentRegistry,
	createPopulationRegistry,
	LAND_INFO,
	OVERVIEW_CONTENT,
	PASSIVE_INFO,
	PHASES,
	POPULATION_INFO,
	POPULATION_ROLES,
	RESOURCES,
	SLOT_INFO,
	STATS,
	TRIGGER_INFO,
} from '@kingdom-builder/contents';
import type { Registry } from '@kingdom-builder/protocol';
import { deserializeSessionRegistries } from '../state/sessionRegistries';
import type { SessionRegistries } from '../state/sessionRegistries';
import { clone } from '../state/clone';

type RegistryPayload<TDefinition extends { id: string }> = Record<
	string,
	TDefinition
>;

type RegistryFactory<TDefinition extends { id: string }> =
	() => Registry<TDefinition>;

type ContentRegistrySnapshot = {
	registries: SessionRegistries;
	metadata: SessionSnapshotMetadata & {
		overviewContent: SessionOverviewMetadata;
	};
};

type DescriptorSource = {
	id: string;
	name?: string | undefined;
	icon?: string | undefined;
	description?: string | undefined;
};

type PopulationDefinition = {
	id: string;
	name?: string | undefined;
	icon?: string | undefined;
};

type PopulationRoleDescriptor = {
	label?: string;
	icon?: string;
	description?: string;
};

const deepFreeze = <TValue>(value: TValue): TValue => {
	if (Array.isArray(value)) {
		for (const entry of value) {
			deepFreeze(entry);
		}
		return Object.freeze(value) as unknown as TValue;
	}
	if (value !== null && typeof value === 'object') {
		for (const entry of Object.values(value as Record<string, unknown>)) {
			deepFreeze(entry);
		}
		return Object.freeze(value) as TValue;
	}
	return value;
};

const freezeRegistries = (registries: SessionRegistries): SessionRegistries => {
	deepFreeze(registries.resources);
	return Object.freeze(registries);
};

const cloneRegistry = <TDefinition extends { id: string }>(
	registry: Registry<TDefinition>,
): RegistryPayload<TDefinition> =>
	Object.fromEntries(
		Array.from(registry.entries()).map(([id, definition]) => [
			id,
			clone(definition),
		]),
	);

const createRegistryPayload = <TDefinition extends { id: string }>(
	factory: RegistryFactory<TDefinition>,
): RegistryPayload<TDefinition> => cloneRegistry(factory());

const createResourceDefinitions = () =>
	Object.fromEntries(
		Object.entries(RESOURCES).map(([key, info]) => {
			const definition: SessionResourceDefinition = { key };
			if (info.icon !== undefined) {
				definition.icon = info.icon;
			}
			if (info.label !== undefined) {
				definition.label = info.label;
			}
			if (info.description !== undefined) {
				definition.description = info.description;
			}
			if (info.tags && info.tags.length > 0) {
				definition.tags = [...info.tags];
			}
			return [key, definition];
		}),
	) as Record<string, SessionResourceDefinition>;

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

const createRegistryDescriptorMap = <TDefinition extends DescriptorSource>(
	registry: RegistryPayload<TDefinition>,
) =>
	Object.fromEntries(
		Object.entries(registry).map(([id, definition]) => [
			id,
			createDescriptor(
				definition.name,
				definition.icon,
				definition.description,
			),
		]),
	) as Record<string, SessionMetadataDescriptor>;

const createPopulationMetadata = (
	registry: RegistryPayload<PopulationDefinition>,
) =>
	Object.fromEntries(
		Object.entries(registry).map(([id, definition]) => {
			const role = POPULATION_ROLES[id as keyof typeof POPULATION_ROLES] as
				| PopulationRoleDescriptor
				| undefined;
			return [
				id,
				createDescriptor(
					definition.name ?? role?.label,
					definition.icon ?? role?.icon,
					role?.description,
				),
			];
		}),
	) as Record<string, SessionMetadataDescriptor>;

const createResourceMetadata = () =>
	Object.fromEntries(
		Object.entries(RESOURCES).map(([key, info]) => [
			key,
			createDescriptor(info.label, info.icon, info.description),
		]),
	) as Record<string, SessionMetadataDescriptor>;

const createStatMetadata = () =>
	Object.fromEntries(
		Object.entries(STATS).map(([key, info]) => {
			const descriptor = createDescriptor(
				info.label,
				info.icon,
				info.description,
			);
			if (info.displayAsPercent !== undefined) {
				descriptor.displayAsPercent = info.displayAsPercent;
			}
			if (info.addFormat) {
				descriptor.format = { ...info.addFormat };
			}
			return [key, descriptor];
		}),
	) as Record<string, SessionMetadataDescriptor>;

const createPhaseMetadata = () =>
	Object.fromEntries(
		PHASES.map((phase) => {
			const steps = phase.steps?.map((step) => {
				const phaseStep: SessionPhaseStepMetadata = { id: step.id };
				if (step.title !== undefined) {
					phaseStep.label = step.title;
				}
				if (step.icon !== undefined) {
					phaseStep.icon = step.icon;
				}
				if (step.triggers && step.triggers.length > 0) {
					phaseStep.triggers = [...step.triggers];
				}
				return phaseStep;
			});
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
			if (steps && steps.length > 0) {
				metadata.steps = steps;
			}
			return [phase.id, metadata];
		}),
	) as Record<string, SessionPhaseMetadata>;

const createTriggerMetadata = () =>
	Object.fromEntries(
		Object.entries(TRIGGER_INFO).map(([key, info]) => [
			key,
			{
				label: info.past,
				icon: info.icon,
				future: info.future,
				past: info.past,
			} satisfies SessionTriggerMetadata,
		]),
	) as Record<string, SessionTriggerMetadata>;

const findUpkeepPhase = () => PHASES.find((phase) => phase.id === 'upkeep');

const createAssetMetadata = () => {
	const upkeepPhase = findUpkeepPhase();
	return {
		population: createDescriptor(
			POPULATION_INFO.label,
			POPULATION_INFO.icon,
			POPULATION_INFO.description,
		),
		land: createDescriptor(LAND_INFO.label, LAND_INFO.icon),
		slot: createDescriptor(SLOT_INFO.label, SLOT_INFO.icon),
		passive: createDescriptor(PASSIVE_INFO.label, PASSIVE_INFO.icon),
		upkeep: createDescriptor(upkeepPhase?.label, upkeepPhase?.icon),
	} as Record<string, SessionMetadataDescriptor>;
};

const createOverviewContentSnapshot = () => clone(OVERVIEW_CONTENT);

const createRegistriesPayload = (): SessionRegistriesPayload => ({
	actions: createRegistryPayload(createActionRegistry),
	buildings: createRegistryPayload(createBuildingRegistry),
	developments: createRegistryPayload(createDevelopmentRegistry),
	populations: createRegistryPayload(createPopulationRegistry),
	resources: createResourceDefinitions(),
});

const createMetadata = (
	registries: SessionRegistriesPayload,
): SessionSnapshotMetadata & { overviewContent: SessionOverviewMetadata } => {
	const overviewContent = createOverviewContentSnapshot();
	const metadata: SessionSnapshotMetadata & {
		overviewContent: SessionOverviewMetadata;
	} = {
		passiveEvaluationModifiers: {},
		resources: createResourceMetadata(),
		populations: createPopulationMetadata(registries.populations ?? {}),
		buildings: createRegistryDescriptorMap(registries.buildings ?? {}),
		developments: createRegistryDescriptorMap(registries.developments ?? {}),
		stats: createStatMetadata(),
		phases: createPhaseMetadata(),
		triggers: createTriggerMetadata(),
		assets: createAssetMetadata(),
		overviewContent,
		overview: overviewContent,
	};
	return metadata;
};

let cachedSnapshot: ContentRegistrySnapshot | null = null;

export const getContentRegistrySnapshot = (): ContentRegistrySnapshot => {
	if (cachedSnapshot) {
		return cachedSnapshot;
	}
	const registriesPayload = createRegistriesPayload();
	const registries = freezeRegistries(
		deserializeSessionRegistries(registriesPayload),
	);
	const metadata = deepFreeze(createMetadata(registriesPayload));
	cachedSnapshot = Object.freeze({ registries, metadata });
	return cachedSnapshot;
};
