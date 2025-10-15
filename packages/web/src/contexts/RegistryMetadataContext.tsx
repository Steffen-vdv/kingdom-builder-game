import React, { createContext, useMemo } from 'react';
import {
	createRegistryLookup,
	createResourceLookup,
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
} from './registryMetadataDescriptors';
import {
	createAssetMetadataSelector,
	createMetadataSelector,
	extractDescriptorRecord,
	extractPhaseRecord,
	extractTriggerRecord,
} from './registryMetadataSelectors';
import {
	DEFAULT_ASSET_DESCRIPTOR_RECORD,
	DEFAULT_BUILDING_DESCRIPTOR_RECORD,
	DEFAULT_DEVELOPMENT_DESCRIPTOR_RECORD,
	DEFAULT_OVERVIEW_CONTENT,
	DEFAULT_PHASE_RECORD,
	DEFAULT_POPULATION_DESCRIPTOR_RECORD,
	DEFAULT_RESOURCE_DESCRIPTOR_RECORD,
	DEFAULT_STAT_DESCRIPTOR_RECORD,
	DEFAULT_TRIGGER_RECORD,
	extractOverviewContent,
	mergeMetadataRecords,
} from './registryMetadataDefaults';
import type {
	RegistryMetadataContextValue,
	RegistryMetadataProviderProps,
} from './registryMetadataContext.types';

export const RegistryMetadataContext =
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
	const descriptorRecords = useMemo(
		() => ({
			resources: mergeMetadataRecords(
				extractDescriptorRecord(metadata, 'resources'),
				DEFAULT_RESOURCE_DESCRIPTOR_RECORD,
			),
			populations: mergeMetadataRecords(
				extractDescriptorRecord(metadata, 'populations'),
				DEFAULT_POPULATION_DESCRIPTOR_RECORD,
			),
			buildings: mergeMetadataRecords(
				extractDescriptorRecord(metadata, 'buildings'),
				DEFAULT_BUILDING_DESCRIPTOR_RECORD,
			),
			developments: mergeMetadataRecords(
				extractDescriptorRecord(metadata, 'developments'),
				DEFAULT_DEVELOPMENT_DESCRIPTOR_RECORD,
			),
			stats: mergeMetadataRecords(
				extractDescriptorRecord(metadata, 'stats'),
				DEFAULT_STAT_DESCRIPTOR_RECORD,
			),
			phases: mergeMetadataRecords(
				extractPhaseRecord(metadata),
				DEFAULT_PHASE_RECORD,
			),
			triggers: mergeMetadataRecords(
				extractTriggerRecord(metadata),
				DEFAULT_TRIGGER_RECORD,
			),
			assets: mergeMetadataRecords(
				extractDescriptorRecord(metadata, 'assets'),
				DEFAULT_ASSET_DESCRIPTOR_RECORD,
			),
		}),
		[metadata],
	);
	const {
		resources: resourceDescriptors,
		populations: populationDescriptors,
		buildings: buildingDescriptors,
		developments: developmentDescriptors,
		stats: statDescriptors,
		phases: phaseDescriptors,
		triggers: triggerDescriptors,
		assets: assetDescriptors,
	} = descriptorRecords;
	const resourceMetadataLookup = useMemo(
		() => buildResourceMetadata(registries.resources, resourceDescriptors),
		[registries.resources, resourceDescriptors],
	);
	const populationMetadataLookup = useMemo(
		() => buildRegistryMetadata(registries.populations, populationDescriptors),
		[registries.populations, populationDescriptors],
	);
	const buildingMetadataLookup = useMemo(
		() => buildRegistryMetadata(registries.buildings, buildingDescriptors),
		[registries.buildings, buildingDescriptors],
	);
	const developmentMetadataLookup = useMemo(
		() =>
			buildRegistryMetadata(registries.developments, developmentDescriptors),
		[registries.developments, developmentDescriptors],
	);
	const statMetadataLookup = useMemo(
		() => buildStatMetadata(statDescriptors),
		[statDescriptors],
	);
	const phaseMetadataLookup = useMemo(
		() => buildPhaseMetadata(phaseDescriptors),
		[phaseDescriptors],
	);
	const triggerMetadataLookup = useMemo(
		() => buildTriggerMetadata(triggerDescriptors),
		[triggerDescriptors],
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
		() => extractOverviewContent(metadata) ?? DEFAULT_OVERVIEW_CONTENT,
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

export {
	useRegistryMetadata,
	useOptionalRegistryMetadata,
	useResourceMetadata,
	usePopulationMetadata,
	useBuildingMetadata,
	useDevelopmentMetadata,
	useStatMetadata,
	usePhaseMetadata,
	useTriggerMetadata,
	useLandMetadata,
	useSlotMetadata,
	usePassiveAssetMetadata,
	useOverviewContent,
} from './registryMetadataHooks';
export type { OptionalRegistryMetadataValue } from './registryMetadataHooks';

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
export type {
	RegistryMetadataContextValue,
	RegistryMetadataProviderProps,
} from './registryMetadataContext.types';
