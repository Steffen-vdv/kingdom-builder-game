import { useMemo } from 'react';
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
	SessionMetadataDescriptor,
	SessionResourceDefinition,
	SessionResourceV2GroupParentSnapshot,
	SessionResourceV2GroupSnapshot,
	SessionResourceV2MetadataSnapshot,
	SessionSnapshotMetadata,
} from '@kingdom-builder/protocol/session';
import type { SessionRegistries } from '../state/sessionRegistries';
import {
	createRegistryLookup,
	createResourceLookup,
	createFrozenRecordLookup,
	type DefinitionLookup,
} from './registryMetadataLookups';
import {
	buildPhaseMetadata,
	buildRegistryMetadata,
	buildResourceMetadata,
	buildResourceGroupMetadata,
	buildResourceGroupParentMetadata,
	buildStatMetadata,
	buildTriggerMetadata,
} from './registryMetadataDescriptors';
import {
	extractDescriptorRecord,
	extractPhaseRecord,
	extractTriggerRecord,
	extractResourceMetadataRecord,
	extractResourceGroupRecord,
	extractResourceGroupParentRecord,
	extractOrderedResourceIds,
	extractOrderedResourceGroupIds,
	extractParentIdByResourceId,
	EMPTY_ORDERED_RESOURCE_GROUP_IDS,
	EMPTY_ORDERED_RESOURCE_IDS,
	EMPTY_PARENT_ID_BY_RESOURCE_ID,
} from './registryMetadataSelectors';

export interface DescriptorOverrides {
	readonly resources?: ReturnType<typeof extractDescriptorRecord> | undefined;
	readonly actionCategories?:
		| ReturnType<typeof extractDescriptorRecord>
		| undefined;
	readonly populations?: ReturnType<typeof extractDescriptorRecord> | undefined;
	readonly buildings?: ReturnType<typeof extractDescriptorRecord> | undefined;
	readonly developments?:
		| ReturnType<typeof extractDescriptorRecord>
		| undefined;
	readonly stats?: ReturnType<typeof extractDescriptorRecord> | undefined;
	readonly assets?: ReturnType<typeof extractDescriptorRecord> | undefined;
	readonly phases?: ReturnType<typeof extractPhaseRecord> | undefined;
	readonly triggers?: ReturnType<typeof extractTriggerRecord> | undefined;
	readonly resourceMetadata?:
		| Record<string, SessionResourceV2MetadataSnapshot>
		| undefined;
	readonly resourceGroups?:
		| Record<string, SessionResourceV2GroupSnapshot>
		| undefined;
	readonly resourceGroupParents?:
		| Record<string, SessionResourceV2GroupParentSnapshot>
		| undefined;
	readonly orderedResourceIds: ReadonlyArray<string>;
	readonly orderedResourceGroupIds: ReadonlyArray<string>;
	readonly parentIdByResourceId: Readonly<Record<string, string>>;
}

const EMPTY_DESCRIPTOR_OVERRIDES: DescriptorOverrides = Object.freeze({
	orderedResourceIds: EMPTY_ORDERED_RESOURCE_IDS,
	orderedResourceGroupIds: EMPTY_ORDERED_RESOURCE_GROUP_IDS,
	parentIdByResourceId: EMPTY_PARENT_ID_BY_RESOURCE_ID,
} satisfies DescriptorOverrides);

export const useDescriptorOverrides = (
	snapshotMetadata: SessionSnapshotMetadata | null,
): DescriptorOverrides =>
	useMemo(() => {
		if (!snapshotMetadata) {
			return EMPTY_DESCRIPTOR_OVERRIDES;
		}
		const requireDescriptorRecord = <TValue>(
			value: TValue | undefined,
			descriptorKey: string,
		): TValue => {
			if (value === undefined) {
				throw new Error(
					`Session snapshot metadata is missing the "${descriptorKey}" ` +
						'descriptors. Ensure metadata includes this record.',
				);
			}
			return value;
		};
		const resourceMetadataRecord =
			extractResourceMetadataRecord(snapshotMetadata);
		const resourceGroupRecord = extractResourceGroupRecord(snapshotMetadata);
		const resourceGroupParentRecord =
			extractResourceGroupParentRecord(snapshotMetadata);
		const actionCategoryRecord = extractDescriptorRecord(
			snapshotMetadata,
			'actionCategories',
		);
		const orderedResourceIds =
			extractOrderedResourceIds(snapshotMetadata) ?? EMPTY_ORDERED_RESOURCE_IDS;
		const orderedResourceGroupIds =
			extractOrderedResourceGroupIds(snapshotMetadata) ??
			EMPTY_ORDERED_RESOURCE_GROUP_IDS;
		const parentIdByResourceId =
			extractParentIdByResourceId(snapshotMetadata) ??
			EMPTY_PARENT_ID_BY_RESOURCE_ID;
		const overrides: DescriptorOverrides = {
			resources: requireDescriptorRecord(
				extractDescriptorRecord(snapshotMetadata, 'resources'),
				'resources',
			),
			actionCategories: actionCategoryRecord ?? undefined,
			populations: requireDescriptorRecord(
				extractDescriptorRecord(snapshotMetadata, 'populations'),
				'populations',
			),
			buildings: requireDescriptorRecord(
				extractDescriptorRecord(snapshotMetadata, 'buildings'),
				'buildings',
			),
			developments: requireDescriptorRecord(
				extractDescriptorRecord(snapshotMetadata, 'developments'),
				'developments',
			),
			stats: requireDescriptorRecord(
				extractDescriptorRecord(snapshotMetadata, 'stats'),
				'stats',
			),
			assets: requireDescriptorRecord(
				extractDescriptorRecord(snapshotMetadata, 'assets'),
				'assets',
			),
			phases: requireDescriptorRecord(
				extractPhaseRecord(snapshotMetadata),
				'phases',
			),
			triggers: requireDescriptorRecord(
				extractTriggerRecord(snapshotMetadata),
				'triggers',
			),
			resourceMetadata: resourceMetadataRecord ?? undefined,
			resourceGroups: resourceGroupRecord ?? undefined,
			resourceGroupParents: resourceGroupParentRecord ?? undefined,
			orderedResourceIds,
			orderedResourceGroupIds,
			parentIdByResourceId,
		} satisfies DescriptorOverrides;
		return Object.freeze(overrides) as DescriptorOverrides;
	}, [snapshotMetadata]);

interface DefinitionLookups {
	readonly resourceLookup: DefinitionLookup<SessionResourceDefinition>;
	readonly resourceV2Lookup: DefinitionLookup<ResourceV2Definition>;
	readonly resourceGroupLookup: DefinitionLookup<ResourceV2GroupMetadata>;
	readonly actionLookup: DefinitionLookup<ActionConfig>;
	readonly actionCategoryLookup: DefinitionLookup<ActionCategoryConfig>;
	readonly buildingLookup: DefinitionLookup<BuildingConfig>;
	readonly developmentLookup: DefinitionLookup<DevelopmentConfig>;
	readonly populationLookup: DefinitionLookup<PopulationConfig>;
}

export const useDefinitionLookups = (
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
	>,
	ordering?: {
		readonly orderedResourceIds?: ReadonlyArray<string>;
		readonly orderedResourceGroupIds?: ReadonlyArray<string>;
	},
): DefinitionLookups => {
	const orderedResourceIds = ordering?.orderedResourceIds;
	const orderedResourceGroupIds = ordering?.orderedResourceGroupIds;
	return useMemo(() => {
		const resourceLookup = createResourceLookup(
			registries.resources,
			orderedResourceIds,
		);
		const resourceV2Lookup = createFrozenRecordLookup(
			registries.resourcesV2,
			'resource v2',
			orderedResourceIds,
		);
		const resourceGroupLookup = createFrozenRecordLookup(
			registries.resourceGroups,
			'resource group',
			orderedResourceGroupIds,
		);
		const actionLookup = createRegistryLookup(registries.actions, 'action');
		const actionCategoryLookup = createRegistryLookup(
			registries.actionCategories,
			'action category',
		);
		const buildingLookup = createRegistryLookup(
			registries.buildings,
			'building',
		);
		const developmentLookup = createRegistryLookup(
			registries.developments,
			'development',
		);
		const populationLookup = createRegistryLookup(
			registries.populations,
			'population',
		);
		return Object.freeze({
			resourceLookup,
			resourceV2Lookup,
			resourceGroupLookup,
			actionLookup,
			actionCategoryLookup,
			buildingLookup,
			developmentLookup,
			populationLookup,
		});
	}, [
		registries.actions,
		registries.actionCategories,
		registries.buildings,
		registries.developments,
		registries.populations,
		registries.resources,
		registries.resourcesV2,
		registries.resourceGroups,
		orderedResourceIds,
		orderedResourceGroupIds,
	]);
};

interface MetadataLookups {
	readonly resourceMetadataLookup: ReturnType<typeof buildResourceMetadata>;
	readonly resourceGroupMetadataLookup: ReturnType<
		typeof buildResourceGroupMetadata
	>;
	readonly resourceGroupParentMetadataLookup: ReturnType<
		typeof buildResourceGroupParentMetadata
	>;
	readonly actionCategoryMetadataLookup: ReturnType<
		typeof buildRegistryMetadata
	>;
	readonly populationMetadataLookup: ReturnType<typeof buildRegistryMetadata>;
	readonly buildingMetadataLookup: ReturnType<typeof buildRegistryMetadata>;
	readonly developmentMetadataLookup: ReturnType<typeof buildRegistryMetadata>;
	readonly statMetadataLookup: ReturnType<typeof buildStatMetadata>;
	readonly phaseMetadataLookup: ReturnType<typeof buildPhaseMetadata>;
	readonly triggerMetadataLookup: ReturnType<typeof buildTriggerMetadata>;
	readonly assetDescriptors:
		| Readonly<Record<string, SessionMetadataDescriptor>>
		| undefined;
	readonly orderedResourceIds: ReadonlyArray<string>;
	readonly orderedResourceGroupIds: ReadonlyArray<string>;
	readonly parentIdByResourceId: Readonly<Record<string, string>>;
}

export const useMetadataLookups = (
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
	>,
	overrides: DescriptorOverrides,
): MetadataLookups =>
	useMemo(() => {
		const resourceMetadataLookup = buildResourceMetadata(
			registries.resources,
			overrides.resources,
			{
				resourceMetadata: overrides.resourceMetadata,
				resourceDefinitions: registries.resourcesV2,
				statMetadata: overrides.stats,
				orderedResourceIds: overrides.orderedResourceIds,
				parentIdByResourceId: overrides.parentIdByResourceId,
			},
		);
		const resourceGroupMetadataLookup = buildResourceGroupMetadata(
			registries.resourceGroups,
			overrides.resourceGroups,
			overrides.orderedResourceGroupIds,
		);
		const resourceGroupParentMetadataLookup = buildResourceGroupParentMetadata(
			registries.resourceGroups,
			overrides.resourceGroupParents,
		);
		const actionCategoryMetadataLookup = buildRegistryMetadata(
			registries.actionCategories,
			overrides.actionCategories,
		);
		const populationMetadataLookup = buildRegistryMetadata(
			registries.populations,
			overrides.populations,
		);
		const buildingMetadataLookup = buildRegistryMetadata(
			registries.buildings,
			overrides.buildings,
		);
		const developmentMetadataLookup = buildRegistryMetadata(
			registries.developments,
			overrides.developments,
		);
		const statMetadataLookup = buildStatMetadata(overrides.stats);
		const phaseMetadataLookup = buildPhaseMetadata(overrides.phases);
		const triggerMetadataLookup = buildTriggerMetadata(overrides.triggers);
		const assetDescriptors = overrides.assets;
		return Object.freeze({
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
			assetDescriptors,
			orderedResourceIds: overrides.orderedResourceIds,
			orderedResourceGroupIds: overrides.orderedResourceGroupIds,
			parentIdByResourceId: overrides.parentIdByResourceId,
		});
	}, [
		overrides,
		registries.actionCategories,
		registries.buildings,
		registries.developments,
		registries.populations,
		registries.resources,
		registries.resourcesV2,
		registries.resourceGroups,
	]);
