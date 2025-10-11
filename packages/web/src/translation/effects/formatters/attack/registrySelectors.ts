import type { SessionSnapshotMetadata } from '@kingdom-builder/protocol/session';
import {
	DEFAULT_REGISTRIES,
	DEFAULT_REGISTRY_METADATA,
} from '../../../../contexts/defaultRegistryMetadata';
import {
	buildRegistryMetadata,
	buildResourceMetadata,
	buildStatMetadata,
	type RegistryMetadataDescriptor,
} from '../../../../contexts/registryMetadataDescriptors';
import {
	createMetadataSelector,
	type MetadataSelector,
} from '../../../../contexts/registryMetadataSelectors';
import type { SessionRegistries } from '../../../../state/sessionRegistries';
import type { TargetInfo } from './types';

export interface AttackRegistryMetadataSelectors {
	readonly resourceMetadata: MetadataSelector<RegistryMetadataDescriptor>;
	readonly statMetadata: MetadataSelector<RegistryMetadataDescriptor>;
	readonly buildingMetadata: MetadataSelector<RegistryMetadataDescriptor>;
}

type RegistrySlice = Pick<SessionRegistries, 'resources' | 'buildings'>;

let selectors: AttackRegistryMetadataSelectors = createSelectors(
	DEFAULT_REGISTRIES,
	DEFAULT_REGISTRY_METADATA,
);

function createSelectors(
	registries: RegistrySlice,
	metadata: SessionSnapshotMetadata,
): AttackRegistryMetadataSelectors {
	const resourceMetadataLookup = buildResourceMetadata(
		registries.resources,
		metadata.resources,
	);
	const buildingMetadataLookup = buildRegistryMetadata(
		registries.buildings,
		metadata.buildings,
	);
	const statMetadataLookup = buildStatMetadata(metadata.stats);
	return {
		resourceMetadata: createMetadataSelector(resourceMetadataLookup),
		buildingMetadata: createMetadataSelector(buildingMetadataLookup),
		statMetadata: createMetadataSelector(statMetadataLookup),
	};
}

export function configureAttackRegistrySelectorsFrom(
	registries: RegistrySlice,
	metadata: SessionSnapshotMetadata,
): void {
	selectors = createSelectors(registries, metadata);
}

export function resetAttackRegistrySelectors(): void {
	selectors = createSelectors(DEFAULT_REGISTRIES, DEFAULT_REGISTRY_METADATA);
}

export function getAttackRegistrySelectors(): AttackRegistryMetadataSelectors {
	return selectors;
}

const trimLabel = (label: string | undefined, fallback: string): string => {
	const trimmed = label?.trim();
	if (trimmed && trimmed.length > 0) {
		return trimmed;
	}
	return fallback;
};

const toTargetInfo = (
	descriptor: RegistryMetadataDescriptor,
	fallbackId: string,
): TargetInfo => ({
	icon: descriptor.icon ?? '',
	label: trimLabel(descriptor.label, fallbackId),
});

export function selectAttackResourceDescriptor(
	resourceKey: string,
): RegistryMetadataDescriptor {
	return selectors.resourceMetadata.select(resourceKey);
}

export function selectAttackResourceInfo(resourceKey: string): TargetInfo {
	const descriptor = selectAttackResourceDescriptor(resourceKey);
	return toTargetInfo(descriptor, resourceKey);
}

export function selectAttackStatDescriptor(
	statKey: string,
): RegistryMetadataDescriptor {
	return selectors.statMetadata.select(statKey);
}

export function selectAttackStatInfo(statKey: string): TargetInfo {
	const descriptor = selectAttackStatDescriptor(statKey);
	return toTargetInfo(descriptor, statKey);
}

export function selectAttackBuildingDescriptor(
	buildingId: string,
): RegistryMetadataDescriptor {
	return selectors.buildingMetadata.select(buildingId);
}

export function selectAttackBuildingInfo(buildingId: string): TargetInfo {
	const descriptor = selectAttackBuildingDescriptor(buildingId);
	return toTargetInfo(descriptor, buildingId);
}

export function getDefaultAttackStatKey(): string | undefined {
	return selectors.statMetadata.list[0]?.id;
}

export function getDefaultAttackBuildingId(): string {
	return selectors.buildingMetadata.list[0]?.id ?? 'unknown_building';
}
