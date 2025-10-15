import { useContext } from 'react';
import type { MetadataSelector } from './registryMetadataSelectors';
import type {
	PhaseMetadata,
	RegistryMetadataDescriptor,
	TriggerMetadata,
} from './registryMetadataDescriptors';
import { RegistryMetadataContext } from './RegistryMetadataContext';
import type { RegistryMetadataContextValue } from './registryMetadataContext.types';

export type OptionalRegistryMetadataValue = RegistryMetadataContextValue | null;

export function useRegistryMetadata(): RegistryMetadataContextValue {
	const value = useContext(RegistryMetadataContext);
	if (!value) {
		throw new Error(
			'useRegistryMetadata must be used within RegistryMetadataProvider',
		);
	}
	return value;
}

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

export const useLandMetadata = () => useRegistryMetadata().landMetadata;

export const useSlotMetadata = () => useRegistryMetadata().slotMetadata;

export const usePassiveAssetMetadata = () =>
	useRegistryMetadata().passiveMetadata;

export const useOverviewContent = () => useRegistryMetadata().overviewContent;
