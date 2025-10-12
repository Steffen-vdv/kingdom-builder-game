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
	createAssetMetadataSelector,
	createMetadataSelector,
	extractDescriptorRecord,
	extractOverviewContent,
	extractPhaseRecord,
	extractTriggerRecord,
	type AssetMetadataSelector,
	type MetadataSelector,
	type OverviewContentMetadata,
} from './registryMetadataSelectors';

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
	overviewContent: OverviewContentMetadata;
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
	const resourceMetadataLookup = useMemo(
		() =>
			buildResourceMetadata(
				registries.resources,
				extractDescriptorRecord(metadata, 'resources'),
			),
		[registries.resources, metadata],
	);
	const populationMetadataLookup = useMemo(
		() =>
			buildRegistryMetadata(
				registries.populations,
				extractDescriptorRecord(metadata, 'populations'),
			),
		[registries.populations, metadata],
	);
	const buildingMetadataLookup = useMemo(
		() =>
			buildRegistryMetadata(
				registries.buildings,
				extractDescriptorRecord(metadata, 'buildings'),
			),
		[registries.buildings, metadata],
	);
	const developmentMetadataLookup = useMemo(
		() =>
			buildRegistryMetadata(
				registries.developments,
				extractDescriptorRecord(metadata, 'developments'),
			),
		[registries.developments, metadata],
	);
	const statMetadataLookup = useMemo(
		() => buildStatMetadata(extractDescriptorRecord(metadata, 'stats')),
		[metadata],
	);
	const phaseMetadataLookup = useMemo(
		() => buildPhaseMetadata(extractPhaseRecord(metadata)),
		[metadata],
	);
	const triggerMetadataLookup = useMemo(
		() => buildTriggerMetadata(extractTriggerRecord(metadata)),
		[metadata],
	);
	const assetDescriptors = useMemo(
		() => extractDescriptorRecord(metadata, 'assets'),
		[metadata],
	);
	const landDescriptor = useMemo(
		() => resolveAssetDescriptor('land', assetDescriptors?.land),
		[assetDescriptors],
	);
	const slotDescriptor = useMemo(
		() => resolveAssetDescriptor('slot', assetDescriptors?.slot),
		[assetDescriptors],
	);
	const passiveDescriptor = useMemo(
		() => resolveAssetDescriptor('passive', assetDescriptors?.passive),
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
		() => extractOverviewContent(metadata),
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

export const useOverviewContent = (): OverviewContentMetadata =>
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
	OverviewContentMetadata,
	OverviewTokenCandidateMap,
} from './registryMetadataSelectors';
