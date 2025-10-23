import { useMemo } from 'react';
import type {
	ActionCategoryConfig,
	ActionConfig,
	BuildingConfig,
	DevelopmentConfig,
	PopulationConfig,
} from '@kingdom-builder/protocol';
import type {
	SessionMetadataDescriptor,
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
} from './registryMetadataDescriptors';
import {
	extractDescriptorRecord,
	extractPhaseRecord,
	extractTriggerRecord,
} from './registryMetadataSelectors';
import { createTranslationResourceV2Registry } from '../translation/resourceV2';

export interface DescriptorOverrides {
	readonly resources?: ReturnType<typeof extractDescriptorRecord>;
	readonly actionCategories?: ReturnType<typeof extractDescriptorRecord>;
	readonly populations?: ReturnType<typeof extractDescriptorRecord>;
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
				const messageSegments = [
					'Session snapshot metadata',
					'is missing the',
					`"${descriptorKey}" descriptors.`,
					'Ensure metadata includes this record.',
				];
				throw new Error(messageSegments.join(' '));
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
		});
	}, [snapshotMetadata]);

interface DefinitionLookups {
	readonly resourceLookup: DefinitionLookup<SessionResourceDefinition>;
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
		| 'buildings'
		| 'developments'
		| 'populations'
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
		const populationLookup = createRegistryLookup(
			registries.populations,
			'population',
		);
		return Object.freeze({
			resourceLookup,
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
	]);

interface MetadataLookups {
	readonly resourceMetadataLookup: ReturnType<typeof buildResourceMetadata>;
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
}

export const useMetadataLookups = (
	registries: Pick<
		SessionRegistries,
		| 'actions'
		| 'actionCategories'
		| 'resources'
		| 'buildings'
		| 'developments'
		| 'populations'
		| 'resourceDefinitions'
		| 'resourceGroups'
	>,
	overrides: DescriptorOverrides,
): MetadataLookups =>
	useMemo(() => {
		const resourceV2 = createTranslationResourceV2Registry(
			registries.resourceDefinitions,
			registries.resourceGroups,
		);
		const resourceMetadataLookup = buildResourceMetadata(
			registries.resources,
			overrides.resources,
			resourceV2,
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
			actionCategoryMetadataLookup,
			populationMetadataLookup,
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
		registries.populations,
		registries.resourceDefinitions,
		registries.resourceGroups,
		registries.resources,
	]);
