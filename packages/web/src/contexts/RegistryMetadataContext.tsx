import React, { createContext, useContext, useMemo } from 'react';
import type {
	BuildingConfig,
	DevelopmentConfig,
	PopulationConfig,
	ActionConfig,
} from '@kingdom-builder/protocol';
import type {
	SessionOverviewMetadata,
	SessionResourceDefinition,
	SessionSnapshotMetadata,
} from '@kingdom-builder/protocol/session';
import type { SessionRegistries } from '../state/sessionRegistries';
import type { DefinitionLookup } from './registryMetadataLookups';
import {
	createAssetMetadataSelector,
	createMetadataSelector,
	type AssetMetadataSelector,
	type MetadataSelector,
} from './registryMetadataSelectors';
import {
	DEFAULT_LAND_DESCRIPTOR,
	DEFAULT_PASSIVE_DESCRIPTOR,
	DEFAULT_SLOT_DESCRIPTOR,
	resolveOverviewContent,
} from './registryMetadataDefaults';
import {
	useDefinitionLookups,
	useDescriptorOverrides,
	useMetadataLookups,
} from './registryMetadataHooks';
import {
	resolveAssetDescriptor,
	type MetadataLookup,
	type PhaseMetadata,
	type RegistryMetadataDescriptor,
	type TriggerMetadata,
} from './registryMetadataDescriptors';

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
	overviewContent: SessionOverviewMetadata;
}

interface RegistryMetadataProviderProps {
	registries: Pick<
		SessionRegistries,
		'actions' | 'resources' | 'buildings' | 'developments' | 'populations'
	>;
	metadata?: SessionSnapshotMetadata | null;
	children: React.ReactNode;
}

const RegistryMetadataContext =
	createContext<RegistryMetadataContextValue | null>(null);

/**
 * Provides registry metadata and selectors to descendant components via context.
 *
 * @param registries - Registry definitions (actions, resources, buildings, developments, populations) used to build lookups and metadata selectors.
 * @param metadata - Optional session snapshot metadata used to derive descriptor overrides and overview content; may be `null` or `undefined`.
 * @param children - React nodes rendered within the provider.
 * @returns A context provider that supplies lookups, metadata selectors, asset metadata selectors, and overview content to descendants.
 */
export function RegistryMetadataProvider({
	registries,
	metadata,
	children,
}: RegistryMetadataProviderProps) {
	const snapshotMetadata = metadata ?? null;
	const descriptorOverrides = useDescriptorOverrides(snapshotMetadata);
	const {
		resourceLookup,
		actionLookup,
		buildingLookup,
		developmentLookup,
		populationLookup,
	} = useDefinitionLookups(registries);
	const {
		resourceMetadataLookup,
		populationMetadataLookup,
		buildingMetadataLookup,
		developmentMetadataLookup,
		statMetadataLookup,
		phaseMetadataLookup,
		triggerMetadataLookup,
		assetDescriptors,
	} = useMetadataLookups(registries, descriptorOverrides);
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
		() => resolveOverviewContent(snapshotMetadata),
		[snapshotMetadata],
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

export const useOverviewContent = (): SessionOverviewMetadata =>
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