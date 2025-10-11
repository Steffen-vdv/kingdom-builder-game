import React, { createContext, useContext, useMemo } from 'react';
import type {
	ActionConfig,
	BuildingConfig,
	DevelopmentConfig,
	PopulationConfig,
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
	createAssetMetadataSelector,
	createMetadataSelector,
	extractDescriptorRecord,
	extractPhaseRecord,
	extractTriggerRecord,
	type AssetMetadataSelector,
	type MetadataSelector,
} from './registryMetadataSelectors';

export interface RegistryMetadataContextValue {
	actions: DefinitionLookup<ActionConfig>;
	resources: DefinitionLookup<SessionResourceDefinition>;
	buildings: DefinitionLookup<BuildingConfig>;
	developments: DefinitionLookup<DevelopmentConfig>;
	populations: DefinitionLookup<PopulationConfig>;
	actionMetadataLookup: MetadataLookup<RegistryMetadataDescriptor>;
	resourceMetadataLookup: MetadataLookup<RegistryMetadataDescriptor>;
	populationMetadataLookup: MetadataLookup<RegistryMetadataDescriptor>;
	buildingMetadataLookup: MetadataLookup<RegistryMetadataDescriptor>;
	developmentMetadataLookup: MetadataLookup<RegistryMetadataDescriptor>;
	statMetadataLookup: MetadataLookup<RegistryMetadataDescriptor>;
	phaseMetadataLookup: MetadataLookup<PhaseMetadata>;
	triggerMetadataLookup: MetadataLookup<TriggerMetadata>;
	actionMetadata: MetadataSelector<RegistryMetadataDescriptor>;
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
	const actionLookup = useMemo(
		() => createRegistryLookup(registries.actions, 'action'),
		[registries.actions],
	);
	const resourceLookup = useMemo(
		() => createResourceLookup(registries.resources),
		[registries.resources],
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
	const actionMetadataLookup = useMemo(
		() =>
			buildRegistryMetadata(
				registries.actions,
				extractDescriptorRecord(metadata, 'actions'),
			),
		[registries.actions, metadata],
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
	const actionMetadata = useMemo(
		() => createMetadataSelector(actionMetadataLookup),
		[actionMetadataLookup],
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
	const value = useMemo<RegistryMetadataContextValue>(
		() =>
			Object.freeze({
				actions: actionLookup,
				resources: resourceLookup,
				buildings: buildingLookup,
				developments: developmentLookup,
				populations: populationLookup,
				actionMetadataLookup,
				resourceMetadataLookup,
				populationMetadataLookup,
				buildingMetadataLookup,
				developmentMetadataLookup,
				statMetadataLookup,
				phaseMetadataLookup,
				triggerMetadataLookup,
				actionMetadata,
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
			}),
		[
			actionLookup,
			resourceLookup,
			buildingLookup,
			developmentLookup,
			populationLookup,
			actionMetadataLookup,
			resourceMetadataLookup,
			populationMetadataLookup,
			buildingMetadataLookup,
			developmentMetadataLookup,
			statMetadataLookup,
			phaseMetadataLookup,
			triggerMetadataLookup,
			actionMetadata,
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
		],
	);
	return (
		<RegistryMetadataContext.Provider value={value}>
			{children}
		</RegistryMetadataContext.Provider>
	);
}

export function useOptionalRegistryMetadata() {
	return useContext(RegistryMetadataContext);
}

export function useRegistryMetadata(): RegistryMetadataContextValue {
	const value = useOptionalRegistryMetadata();
	if (!value) {
		throw new Error(
			'useRegistryMetadata must be used within RegistryMetadataProvider',
		);
	}
	return value;
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

export type {
	RegistryMetadataDescriptor,
	TriggerMetadata,
	PhaseMetadata,
	MetadataLookup,
} from './registryMetadataDescriptors';
export type { DefinitionLookup } from './registryMetadataLookups';
export type { AssetMetadata } from './registryMetadataDescriptors';
export const useActionMetadata = () => useRegistryMetadata().actionMetadata;
