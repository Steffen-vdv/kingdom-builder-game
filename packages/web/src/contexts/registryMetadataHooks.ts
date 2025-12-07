import { useMemo } from 'react';
import type {
	ActionCategoryConfig,
	ActionConfig,
	BuildingConfig,
	DevelopmentConfig,
	ResourceDefinition,
} from '@kingdom-builder/protocol';
import type {
	SessionMetadataDescriptor,
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
} from './registryMetadataDescriptors';
import {
	extractDescriptorRecord,
	extractPhaseRecord,
	extractTriggerRecord,
} from './registryMetadataSelectors';

export interface DescriptorOverrides {
	readonly resources?: ReturnType<typeof extractDescriptorRecord>;
	readonly actionCategories?: ReturnType<typeof extractDescriptorRecord>;
	readonly buildings?: ReturnType<typeof extractDescriptorRecord>;
	readonly developments?: ReturnType<typeof extractDescriptorRecord>;
	readonly stats?: ReturnType<typeof extractDescriptorRecord>;
	readonly assets?: ReturnType<typeof extractDescriptorRecord>;
	readonly phases?: ReturnType<typeof extractPhaseRecord>;
	readonly triggers?: ReturnType<typeof extractTriggerRecord>;
}

const EMPTY_DESCRIPTOR_OVERRIDES: DescriptorOverrides = Object.freeze({});

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
		return Object.freeze({
			resources: requireDescriptorRecord(
				extractDescriptorRecord(snapshotMetadata, 'resources'),
				'resources',
			),
			actionCategories: extractDescriptorRecord(
				snapshotMetadata,
				'actionCategories',
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
		});
	}, [snapshotMetadata]);

interface DefinitionLookups {
	readonly resourceLookup: DefinitionLookup<ResourceDefinition>;
	readonly actionLookup: DefinitionLookup<ActionConfig>;
	readonly actionCategoryLookup: DefinitionLookup<ActionCategoryConfig>;
	readonly buildingLookup: DefinitionLookup<BuildingConfig>;
	readonly developmentLookup: DefinitionLookup<DevelopmentConfig>;
}

export const useDefinitionLookups = (
	registries: Pick<
		SessionRegistries,
		| 'actions'
		| 'actionCategories'
		| 'resources'
		| 'buildings'
		| 'developments'
	>,
): DefinitionLookups =>
	useMemo(() => {
		const resourceLookup = createResourceLookup(registries.resources);
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
		return Object.freeze({
			resourceLookup,
			actionLookup,
			actionCategoryLookup,
			buildingLookup,
			developmentLookup,
		});
	}, [
		registries.actions,
		registries.actionCategories,
		registries.buildings,
		registries.developments,
		registries.resources,
	]);

interface MetadataLookups {
	readonly resourceMetadataLookup: ReturnType<typeof buildResourceMetadata>;
	readonly actionCategoryMetadataLookup: ReturnType<
		typeof buildRegistryMetadata
	>;
	readonly buildingMetadataLookup: ReturnType<typeof buildRegistryMetadata>;
	readonly developmentMetadataLookup: ReturnType<typeof buildRegistryMetadata>;
	readonly statMetadataLookup: ReturnType<typeof buildStatMetadata>;
	readonly phaseMetadataLookup: ReturnType<typeof buildPhaseMetadata>;
	readonly triggerMetadataLookup: ReturnType<typeof buildTriggerMetadata>;
	readonly assetDescriptors:
		| Readonly<Record<string, SessionMetadataDescriptor>>
		| undefined;
}

export const useMetadataLookups = (
	registries: Pick<
		SessionRegistries,
		| 'actions'
		| 'actionCategories'
		| 'resources'
		| 'buildings'
		| 'developments'
	>,
	overrides: DescriptorOverrides,
): MetadataLookups =>
	useMemo(() => {
		const resourceMetadataLookup = buildResourceMetadata(
			registries.resources,
			overrides.resources,
		);
		const actionCategoryMetadataLookup = buildRegistryMetadata(
			registries.actionCategories,
			overrides.actionCategories,
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
			actionCategoryMetadataLookup,
			buildingMetadataLookup,
			developmentMetadataLookup,
			statMetadataLookup,
			phaseMetadataLookup,
			triggerMetadataLookup,
			assetDescriptors,
		});
	}, [
		overrides,
		registries.actionCategories,
		registries.buildings,
		registries.developments,
		registries.resources,
	]);
