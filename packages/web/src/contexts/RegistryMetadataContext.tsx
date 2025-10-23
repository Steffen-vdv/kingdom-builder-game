import React, { createContext, useContext, useMemo } from 'react';
import type {
	ActionCategoryConfig,
	ActionConfig,
	BuildingConfig,
	DevelopmentConfig,
	PopulationConfig,
	ResourceV2Definition,
	ResourceV2GroupMetadata,
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
	resourcesV2: DefinitionLookup<ResourceV2Definition>;
	resourceGroups: DefinitionLookup<ResourceV2GroupMetadata>;
	actions: DefinitionLookup<ActionConfig>;
	actionCategories: DefinitionLookup<ActionCategoryConfig>;
	buildings: DefinitionLookup<BuildingConfig>;
	developments: DefinitionLookup<DevelopmentConfig>;
	populations: DefinitionLookup<PopulationConfig>;
	resourceMetadataLookup: MetadataLookup<RegistryMetadataDescriptor>;
	resourceGroupMetadataLookup: MetadataLookup<RegistryMetadataDescriptor>;
	resourceGroupParentMetadataLookup: MetadataLookup<RegistryMetadataDescriptor>;
	actionCategoryMetadataLookup: MetadataLookup<RegistryMetadataDescriptor>;
	populationMetadataLookup: MetadataLookup<RegistryMetadataDescriptor>;
	buildingMetadataLookup: MetadataLookup<RegistryMetadataDescriptor>;
	developmentMetadataLookup: MetadataLookup<RegistryMetadataDescriptor>;
	statMetadataLookup: MetadataLookup<RegistryMetadataDescriptor>;
	phaseMetadataLookup: MetadataLookup<PhaseMetadata>;
	triggerMetadataLookup: MetadataLookup<TriggerMetadata>;
	resourceMetadata: MetadataSelector<RegistryMetadataDescriptor>;
	resourceGroupMetadata: MetadataSelector<RegistryMetadataDescriptor>;
	resourceGroupParentMetadata: MetadataSelector<RegistryMetadataDescriptor>;
	actionCategoryMetadata: MetadataSelector<RegistryMetadataDescriptor>;
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
	orderedResourceIds: ReadonlyArray<string>;
	orderedResourceGroupIds: ReadonlyArray<string>;
	parentIdByResourceId: Readonly<Record<string, string>>;
}

type SnapshotMetadataWithOverview = SessionSnapshotMetadata & {
	overviewContent?: SessionOverviewMetadata | undefined;
};

const METADATA_REQUIRED_ERROR =
	'RegistryMetadataProvider requires metadata with asset and overview ' +
	'descriptors.';
const ASSET_DESCRIPTOR_ERROR =
	'RegistryMetadataProvider requires metadata.assets.land, ' +
	'metadata.assets.slot, and metadata.assets.passive.';
const OVERVIEW_DESCRIPTOR_ERROR =
	'RegistryMetadataProvider requires metadata.overviewContent or ' +
	'metadata.overview.';

interface RegistryMetadataProviderProps {
	registries: Pick<
		SessionRegistries,
		| 'actions'
		| 'actionCategories'
		| 'resources'
		| 'resourcesV2'
		| 'resourceGroups'
		| 'buildings'
		| 'developments'
		| 'populations'
	>;
	metadata?: SessionSnapshotMetadata | null;
	children: React.ReactNode;
}

const RegistryMetadataContext =
	createContext<RegistryMetadataContextValue | null>(null);

export function RegistryMetadataProvider({
	registries,
	metadata,
	children,
}: RegistryMetadataProviderProps) {
	if (!metadata) {
		throw new Error(METADATA_REQUIRED_ERROR);
	}
	const metadataWithOverview: SnapshotMetadataWithOverview = metadata;
	const assets = metadataWithOverview.assets;
	if (!assets) {
		throw new Error(ASSET_DESCRIPTOR_ERROR);
	}
	const { land, slot, passive } = assets;
	if (!land || !slot || !passive) {
		throw new Error(ASSET_DESCRIPTOR_ERROR);
	}
	const overviewSource =
		metadataWithOverview.overviewContent ?? metadataWithOverview.overview;
	if (!overviewSource) {
		throw new Error(OVERVIEW_DESCRIPTOR_ERROR);
	}
	const descriptorOverrides = useDescriptorOverrides(metadataWithOverview);
	const {
		resourceLookup,
		resourceV2Lookup,
		resourceGroupLookup,
		actionLookup,
		actionCategoryLookup,
		buildingLookup,
		developmentLookup,
		populationLookup,
	} = useDefinitionLookups(registries, descriptorOverrides);
	const {
		resourceMetadataLookup,
		resourceGroupMetadataLookup,
		resourceGroupParentMetadataLookup,
		actionCategoryMetadataLookup,
		populationMetadataLookup,
		buildingMetadataLookup,
		developmentMetadataLookup,
		statMetadataLookup,
		phaseMetadataLookup,
		triggerMetadataLookup,
		orderedResourceIds,
		orderedResourceGroupIds,
		parentIdByResourceId,
	} = useMetadataLookups(registries, descriptorOverrides);
	const landDescriptor = useMemo(
		() => resolveAssetDescriptor('land', land),
		[land],
	);
	const slotDescriptor = useMemo(
		() => resolveAssetDescriptor('slot', slot),
		[slot],
	);
	const passiveDescriptor = useMemo(
		() => resolveAssetDescriptor('passive', passive),
		[passive],
	);
	const resourceMetadata = useMemo(
		() => createMetadataSelector(resourceMetadataLookup),
		[resourceMetadataLookup],
	);
	const resourceGroupMetadata = useMemo(
		() => createMetadataSelector(resourceGroupMetadataLookup),
		[resourceGroupMetadataLookup],
	);
	const resourceGroupParentMetadata = useMemo(
		() => createMetadataSelector(resourceGroupParentMetadataLookup),
		[resourceGroupParentMetadataLookup],
	);
	const actionCategoryMetadata = useMemo(
		() => createMetadataSelector(actionCategoryMetadataLookup),
		[actionCategoryMetadataLookup],
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
	const overviewContent = useMemo(() => overviewSource, [overviewSource]);
	const value = useMemo<RegistryMetadataContextValue>(
		() =>
			Object.freeze({
				resources: resourceLookup,
				resourcesV2: resourceV2Lookup,
				resourceGroups: resourceGroupLookup,
				actions: actionLookup,
				actionCategories: actionCategoryLookup,
				buildings: buildingLookup,
				developments: developmentLookup,
				populations: populationLookup,
				resourceMetadataLookup,
				resourceGroupMetadataLookup,
				resourceGroupParentMetadataLookup,
				actionCategoryMetadataLookup,
				populationMetadataLookup,
				buildingMetadataLookup,
				developmentMetadataLookup,
				statMetadataLookup,
				phaseMetadataLookup,
				triggerMetadataLookup,
				resourceMetadata,
				resourceGroupMetadata,
				resourceGroupParentMetadata,
				actionCategoryMetadata,
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
				orderedResourceIds,
				orderedResourceGroupIds,
				parentIdByResourceId,
			}),
		[
			resourceLookup,
			resourceV2Lookup,
			resourceGroupLookup,
			actionLookup,
			actionCategoryLookup,
			buildingLookup,
			developmentLookup,
			populationLookup,
			resourceMetadataLookup,
			resourceGroupMetadataLookup,
			resourceGroupParentMetadataLookup,
			actionCategoryMetadataLookup,
			populationMetadataLookup,
			buildingMetadataLookup,
			developmentMetadataLookup,
			statMetadataLookup,
			phaseMetadataLookup,
			triggerMetadataLookup,
			resourceMetadata,
			resourceGroupMetadata,
			resourceGroupParentMetadata,
			actionCategoryMetadata,
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
			orderedResourceIds,
			orderedResourceGroupIds,
			parentIdByResourceId,
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
export * from './registryMetadataContextSelectors';
