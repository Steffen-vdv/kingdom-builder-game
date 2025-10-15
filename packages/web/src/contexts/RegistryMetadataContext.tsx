import React, { createContext, useContext, useMemo } from 'react';
import type {
	BuildingConfig,
	DevelopmentConfig,
	PopulationConfig,
	ActionConfig,
} from '@kingdom-builder/protocol';
import type {
	SessionResourceDefinition,
	SessionSnapshotMetadata,
} from '@kingdom-builder/protocol/session';
import type { SessionRegistries } from '../state/sessionRegistries';
import {
	createRegistryLookup,
	createResourceLookup,
	type DefinitionLookup,
} from './registryMetadataLookups';
import {
	DEFAULT_LAND_DESCRIPTOR,
	DEFAULT_PASSIVE_DESCRIPTOR,
	DEFAULT_SLOT_DESCRIPTOR,
	buildPhaseMetadata,
	buildRegistryMetadata,
	buildResourceMetadata,
	buildStatMetadata,
	buildTriggerMetadata,
	resolveAssetDescriptor,
	type MetadataLookup,
	type PhaseMetadata,
	type RegistryMetadataDescriptor,
	type TriggerMetadata,
} from './registryMetadataDescriptors';
import {
	DEFAULT_REGISTRY_METADATA,
	DEFAULT_OVERVIEW_CONTENT,
	type DefaultOverviewContent,
} from './defaultRegistryMetadata';
import {
	createAssetMetadataSelector,
	createMetadataSelector,
	extractDescriptorRecord,
	extractPhaseRecord,
	extractTriggerRecord,
	type AssetMetadataSelector,
	type MetadataSelector,
} from './registryMetadataSelectors';

type OverviewContentTemplate = DefaultOverviewContent;

type SnapshotMetadataWithOverview = SessionSnapshotMetadata & {
	overviewContent?: OverviewContentTemplate;
};

const DEFAULT_RESOURCE_DESCRIPTORS = extractDescriptorRecord(
	DEFAULT_REGISTRY_METADATA,
	'resources',
);

const DEFAULT_POPULATION_DESCRIPTORS = extractDescriptorRecord(
	DEFAULT_REGISTRY_METADATA,
	'populations',
);

const DEFAULT_BUILDING_DESCRIPTORS = extractDescriptorRecord(
	DEFAULT_REGISTRY_METADATA,
	'buildings',
);

const DEFAULT_DEVELOPMENT_DESCRIPTORS = extractDescriptorRecord(
	DEFAULT_REGISTRY_METADATA,
	'developments',
);

const DEFAULT_STAT_DESCRIPTORS = extractDescriptorRecord(
	DEFAULT_REGISTRY_METADATA,
	'stats',
);

const DEFAULT_ASSET_DESCRIPTORS = extractDescriptorRecord(
	DEFAULT_REGISTRY_METADATA,
	'assets',
);

const DEFAULT_PHASES = extractPhaseRecord(DEFAULT_REGISTRY_METADATA);

const DEFAULT_TRIGGERS = extractTriggerRecord(DEFAULT_REGISTRY_METADATA);

const mergeDescriptorRecords = <TValue,>(
	fallback: Readonly<Record<string, TValue>> | undefined,
	overrides: Readonly<Record<string, TValue>> | undefined,
): Readonly<Record<string, TValue>> | undefined => {
	if (!fallback) {
		return overrides;
	}
	if (!overrides) {
		return fallback;
	}
	return Object.freeze({
		...fallback,
		...overrides,
	}) as Readonly<Record<string, TValue>>;
};

const readOverviewContent = (
	snapshot: SessionSnapshotMetadata,
): OverviewContentTemplate | undefined =>
	(snapshot as SnapshotMetadataWithOverview).overviewContent;

export interface RegistryMetadataContextValue {
	resources: DefinitionLookup<SessionResourceDefinition>;
	actions: DefinitionLookup<ActionConfig>;
	buildings: DefinitionLookup<BuildingConfig>;
	developments: DefinitionLookup<DevelopmentConfig>;
	populations: DefinitionLookup<PopulationConfig>;
	resourceMetadataLookup: MetadataLookup<RegistryMetadataDescriptor>;
	populationMetadataLookup: MetadataLookup<RegistryMetadataDescriptor>;
	buildingMetadataLookup: MetadataLookup<RegistryMetadataDescriptor>;
	developmentMetadataLookup: MetadataLookup<RegistryMetadataDescriptor>;
	statMetadataLookup: MetadataLookup<RegistryMetadataDescriptor>;
	phaseMetadataLookup: MetadataLookup<PhaseMetadata>;
	triggerMetadataLookup: MetadataLookup<TriggerMetadata>;
	resourceMetadata: MetadataSelector<RegistryMetadataDescriptor>;
	populationMetadata: MetadataSelector<RegistryMetadataDescriptor>;
	buildingMetadata: MetadataSelector<RegistryMetadataDescriptor>;
	developmentMetadata: MetadataSelector<RegistryMetadataDescriptor>;
	statMetadata: MetadataSelector<RegistryMetadataDescriptor>;
	phaseMetadata: MetadataSelector<PhaseMetadata>;
	triggerMetadata: MetadataSelector<TriggerMetadata>;
	landMetadata: AssetMetadataSelector;
	slotMetadata: AssetMetadataSelector;
	passiveMetadata: AssetMetadataSelector;
	overviewContent: OverviewContentTemplate;
}

interface RegistryMetadataProviderProps {
	registries: Pick<
		SessionRegistries,
		'actions' | 'resources' | 'buildings' | 'developments' | 'populations'
	>;
	metadata: SessionSnapshotMetadata;
	children: React.ReactNode;
}

const RegistryMetadataContext =
	createContext<RegistryMetadataContextValue | null>(null);

export function RegistryMetadataProvider({
	registries,
	metadata,
	children,
}: RegistryMetadataProviderProps) {
	const resourceLookup = useMemo(
		() => createResourceLookup(registries.resources),
		[registries.resources],
	);
	const actionLookup = useMemo(
		() => createRegistryLookup(registries.actions, 'action'),
		[registries.actions],
	);
	const buildingLookup = useMemo(
		() => createRegistryLookup(registries.buildings, 'building'),
		[registries.buildings],
	);
	const developmentLookup = useMemo(
		() => createRegistryLookup(registries.developments, 'development'),
		[registries.developments],
	);
	const populationLookup = useMemo(
		() => createRegistryLookup(registries.populations, 'population'),
		[registries.populations],
	);
	const resourceDescriptors = useMemo(
		() =>
			mergeDescriptorRecords(
				DEFAULT_RESOURCE_DESCRIPTORS,
				extractDescriptorRecord(metadata, 'resources'),
			),
		[metadata],
	);
	const resourceMetadataLookup = useMemo(
		() => buildResourceMetadata(registries.resources, resourceDescriptors),
		[registries.resources, resourceDescriptors],
	);
	const populationDescriptors = useMemo(
		() =>
			mergeDescriptorRecords(
				DEFAULT_POPULATION_DESCRIPTORS,
				extractDescriptorRecord(metadata, 'populations'),
			),
		[metadata],
	);
	const populationMetadataLookup = useMemo(
		() => buildRegistryMetadata(registries.populations, populationDescriptors),
		[registries.populations, populationDescriptors],
	);
	const buildingDescriptors = useMemo(
		() =>
			mergeDescriptorRecords(
				DEFAULT_BUILDING_DESCRIPTORS,
				extractDescriptorRecord(metadata, 'buildings'),
			),
		[metadata],
	);
	const buildingMetadataLookup = useMemo(
		() => buildRegistryMetadata(registries.buildings, buildingDescriptors),
		[registries.buildings, buildingDescriptors],
	);
	const developmentDescriptors = useMemo(
		() =>
			mergeDescriptorRecords(
				DEFAULT_DEVELOPMENT_DESCRIPTORS,
				extractDescriptorRecord(metadata, 'developments'),
			),
		[metadata],
	);
	const developmentMetadataLookup = useMemo(
		() =>
			buildRegistryMetadata(registries.developments, developmentDescriptors),
		[registries.developments, developmentDescriptors],
	);
	const statDescriptors = useMemo(
		() =>
			mergeDescriptorRecords(
				DEFAULT_STAT_DESCRIPTORS,
				extractDescriptorRecord(metadata, 'stats'),
			),
		[metadata],
	);
	const statMetadataLookup = useMemo(
		() => buildStatMetadata(statDescriptors),
		[statDescriptors],
	);
	const phaseDescriptors = useMemo(
		() => mergeDescriptorRecords(DEFAULT_PHASES, extractPhaseRecord(metadata)),
		[metadata],
	);
	const phaseMetadataLookup = useMemo(
		() => buildPhaseMetadata(phaseDescriptors),
		[phaseDescriptors],
	);
	const triggerDescriptors = useMemo(
		() =>
			mergeDescriptorRecords(DEFAULT_TRIGGERS, extractTriggerRecord(metadata)),
		[metadata],
	);
	const triggerMetadataLookup = useMemo(
		() => buildTriggerMetadata(triggerDescriptors),
		[triggerDescriptors],
	);
	const assetDescriptors = useMemo(
		() =>
			mergeDescriptorRecords(
				DEFAULT_ASSET_DESCRIPTORS,
				extractDescriptorRecord(metadata, 'assets'),
			),
		[metadata],
	);
	const landDescriptor = useMemo(
		() =>
			resolveAssetDescriptor(
				'land',
				assetDescriptors?.land,
				DEFAULT_LAND_DESCRIPTOR,
			),
		[assetDescriptors],
	);
	const slotDescriptor = useMemo(
		() =>
			resolveAssetDescriptor(
				'slot',
				assetDescriptors?.slot,
				DEFAULT_SLOT_DESCRIPTOR,
			),
		[assetDescriptors],
	);
	const passiveDescriptor = useMemo(
		() =>
			resolveAssetDescriptor(
				'passive',
				assetDescriptors?.passive,
				DEFAULT_PASSIVE_DESCRIPTOR,
			),
		[assetDescriptors],
	);
	const resourceMetadata = useMemo(
		() => createMetadataSelector(resourceMetadataLookup),
		[resourceMetadataLookup],
	);
	const populationMetadata = useMemo(
		() => createMetadataSelector(populationMetadataLookup),
		[populationMetadataLookup],
	);
	const buildingMetadata = useMemo(
		() => createMetadataSelector(buildingMetadataLookup),
		[buildingMetadataLookup],
	);
	const developmentMetadata = useMemo(
		() => createMetadataSelector(developmentMetadataLookup),
		[developmentMetadataLookup],
	);
	const statMetadata = useMemo(
		() => createMetadataSelector(statMetadataLookup),
		[statMetadataLookup],
	);
	const phaseMetadata = useMemo(
		() => createMetadataSelector(phaseMetadataLookup),
		[phaseMetadataLookup],
	);
	const triggerMetadata = useMemo(
		() => createMetadataSelector(triggerMetadataLookup),
		[triggerMetadataLookup],
	);
	const landMetadata = useMemo(
		() => createAssetMetadataSelector(landDescriptor),
		[landDescriptor],
	);
	const slotMetadata = useMemo(
		() => createAssetMetadataSelector(slotDescriptor),
		[slotDescriptor],
	);
	const passiveMetadata = useMemo(
		() => createAssetMetadataSelector(passiveDescriptor),
		[passiveDescriptor],
	);
	const overviewContent = useMemo(
		() => readOverviewContent(metadata) ?? DEFAULT_OVERVIEW_CONTENT,
		[metadata],
	);
	const value = useMemo<RegistryMetadataContextValue>(
		() =>
			Object.freeze({
				resources: resourceLookup,
				actions: actionLookup,
				buildings: buildingLookup,
				developments: developmentLookup,
				populations: populationLookup,
				resourceMetadataLookup,
				populationMetadataLookup,
				buildingMetadataLookup,
				developmentMetadataLookup,
				statMetadataLookup,
				phaseMetadataLookup,
				triggerMetadataLookup,
				resourceMetadata,
				populationMetadata,
				buildingMetadata,
				developmentMetadata,
				statMetadata,
				phaseMetadata,
				triggerMetadata,
				landMetadata,
				slotMetadata,
				passiveMetadata,
				overviewContent,
			}),
		[
			resourceLookup,
			actionLookup,
			buildingLookup,
			developmentLookup,
			populationLookup,
			resourceMetadataLookup,
			populationMetadataLookup,
			buildingMetadataLookup,
			developmentMetadataLookup,
			statMetadataLookup,
			phaseMetadataLookup,
			triggerMetadataLookup,
			resourceMetadata,
			populationMetadata,
			buildingMetadata,
			developmentMetadata,
			statMetadata,
			phaseMetadata,
			triggerMetadata,
			landMetadata,
			slotMetadata,
			passiveMetadata,
			overviewContent,
		],
	);
	return (
		<RegistryMetadataContext.Provider value={value}>
			{children}
		</RegistryMetadataContext.Provider>
	);
}

export function useRegistryMetadata(): RegistryMetadataContextValue {
	const value = useContext(RegistryMetadataContext);
	if (!value) {
		throw new Error(
			'useRegistryMetadata must be used within RegistryMetadataProvider',
		);
	}
	return value;
}

type OptionalRegistryMetadataValue = RegistryMetadataContextValue | null;

export function useOptionalRegistryMetadata(): OptionalRegistryMetadataValue {
	return useContext(RegistryMetadataContext);
}

export const useResourceMetadata =
	(): MetadataSelector<RegistryMetadataDescriptor> =>
		useRegistryMetadata().resourceMetadata;

export const usePopulationMetadata =
	(): MetadataSelector<RegistryMetadataDescriptor> =>
		useRegistryMetadata().populationMetadata;

export const useBuildingMetadata =
	(): MetadataSelector<RegistryMetadataDescriptor> =>
		useRegistryMetadata().buildingMetadata;

export const useDevelopmentMetadata =
	(): MetadataSelector<RegistryMetadataDescriptor> =>
		useRegistryMetadata().developmentMetadata;

export const useStatMetadata =
	(): MetadataSelector<RegistryMetadataDescriptor> =>
		useRegistryMetadata().statMetadata;

export const usePhaseMetadata = (): MetadataSelector<PhaseMetadata> =>
	useRegistryMetadata().phaseMetadata;

export const useTriggerMetadata = (): MetadataSelector<TriggerMetadata> =>
	useRegistryMetadata().triggerMetadata;

export const useLandMetadata = (): AssetMetadataSelector =>
	useRegistryMetadata().landMetadata;

export const useSlotMetadata = (): AssetMetadataSelector =>
	useRegistryMetadata().slotMetadata;

export const usePassiveAssetMetadata = (): AssetMetadataSelector =>
	useRegistryMetadata().passiveMetadata;

export const useOverviewContent = (): OverviewContentTemplate =>
	useRegistryMetadata().overviewContent;

export type {
	RegistryMetadataDescriptor,
	TriggerMetadata,
	PhaseMetadata,
	MetadataLookup,
} from './registryMetadataDescriptors';
export type { DefinitionLookup } from './registryMetadataLookups';
export type { AssetMetadata } from './registryMetadataDescriptors';
export type {
	AssetMetadataSelector,
	MetadataSelector,
} from './registryMetadataSelectors';
