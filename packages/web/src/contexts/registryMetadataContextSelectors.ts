import type {
	ResourceV2Definition,
	ResourceV2GroupMetadata,
} from '@kingdom-builder/protocol';
import type { SessionOverviewMetadata } from '@kingdom-builder/protocol/session';
import { useRegistryMetadata } from './RegistryMetadataContext';
import type { DefinitionLookup } from './registryMetadataLookups';
import type {
	AssetMetadataSelector,
	MetadataSelector,
} from './registryMetadataSelectors';
import type {
	PhaseMetadata,
	RegistryMetadataDescriptor,
	TriggerMetadata,
} from './registryMetadataDescriptors';

export const useResourceMetadata =
	(): MetadataSelector<RegistryMetadataDescriptor> =>
		useRegistryMetadata().resourceMetadata;

export const useResourceGroupMetadata =
	(): MetadataSelector<RegistryMetadataDescriptor> =>
		useRegistryMetadata().resourceGroupMetadata;

export const useResourceGroupParentMetadata =
	(): MetadataSelector<RegistryMetadataDescriptor> =>
		useRegistryMetadata().resourceGroupParentMetadata;

export const useResourceV2Definitions =
	(): DefinitionLookup<ResourceV2Definition> =>
		useRegistryMetadata().resourcesV2;

export const useResourceGroupDefinitions =
	(): DefinitionLookup<ResourceV2GroupMetadata> =>
		useRegistryMetadata().resourceGroups;

export const useOrderedResourceIds = (): ReadonlyArray<string> =>
	useRegistryMetadata().orderedResourceIds;

export const useOrderedResourceGroupIds = (): ReadonlyArray<string> =>
	useRegistryMetadata().orderedResourceGroupIds;

export const useResourceParentMap = (): Readonly<Record<string, string>> =>
	useRegistryMetadata().parentIdByResourceId;

export const usePopulationMetadata =
	(): MetadataSelector<RegistryMetadataDescriptor> =>
		useRegistryMetadata().populationMetadata;

export const useActionCategoryMetadata =
	(): MetadataSelector<RegistryMetadataDescriptor> =>
		useRegistryMetadata().actionCategoryMetadata;

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
