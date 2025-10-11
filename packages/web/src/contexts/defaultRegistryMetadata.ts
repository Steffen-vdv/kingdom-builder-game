import {
	createActionRegistry,
	createBuildingRegistry,
	createDevelopmentRegistry,
	createPopulationRegistry,
	RESOURCES,
	STATS,
	PHASES,
	TRIGGER_INFO,
	LAND_INFO,
	SLOT_INFO,
	PASSIVE_INFO,
} from '@kingdom-builder/contents';
import type { Registry } from '@kingdom-builder/protocol';
import type {
	SessionMetadataDescriptor,
	SessionPhaseMetadata,
	SessionSnapshotMetadata,
	SessionTriggerMetadata,
} from '@kingdom-builder/protocol/session';
import type { SessionRegistries } from '../state/sessionRegistries';

type PhaseStepMetadataEntry = NonNullable<
	SessionPhaseMetadata['steps']
>[number];

interface NamedEntity {
	id: string;
	name?: string | undefined;
	icon?: string | undefined;
	description?: string | undefined;
}

function createDescriptor(
	label?: string,
	icon?: string,
	description?: string,
): SessionMetadataDescriptor {
	const descriptor: SessionMetadataDescriptor = {};
	if (label !== undefined) {
		descriptor.label = label;
	}
	if (icon !== undefined) {
		descriptor.icon = icon;
	}
	if (description !== undefined) {
		descriptor.description = description;
	}
	return Object.freeze(descriptor);
}

function createRegistryDescriptorMap<T extends NamedEntity>(
	registry: Registry<T>,
): Record<string, SessionMetadataDescriptor> {
	const descriptors: Record<string, SessionMetadataDescriptor> = {};
	for (const [id, definition] of registry.entries()) {
		descriptors[id] = createDescriptor(
			definition.name,
			definition.icon,
			definition.description,
		);
	}
	return Object.freeze(descriptors);
}

function createResourceDefinitions() {
	const record: Record<
		string,
		{
			key: string;
			icon?: string | undefined;
			label?: string | undefined;
			description?: string | undefined;
			tags?: string[] | undefined;
		}
	> = {};
	for (const [key, info] of Object.entries(RESOURCES)) {
		const entry: {
			key: string;
			icon?: string | undefined;
			label?: string | undefined;
			description?: string | undefined;
			tags?: string[] | undefined;
		} = { key };
		if (info.icon !== undefined) {
			entry.icon = info.icon;
		}
		if (info.label !== undefined) {
			entry.label = info.label;
		}
		if (info.description !== undefined) {
			entry.description = info.description;
		}
		if (info.tags && info.tags.length > 0) {
			entry.tags = [...info.tags];
		}
		record[key] = Object.freeze(entry);
	}
	return Object.freeze(record);
}

function createResourceMetadata() {
	const descriptors: Record<string, SessionMetadataDescriptor> = {};
	for (const [key, info] of Object.entries(RESOURCES)) {
		descriptors[key] = createDescriptor(
			info.label,
			info.icon,
			info.description,
		);
	}
	return Object.freeze(descriptors);
}

function createStatMetadata() {
	const descriptors: Record<string, SessionMetadataDescriptor> = {};
	for (const [key, info] of Object.entries(STATS)) {
		descriptors[key] = createDescriptor(
			info.label,
			info.icon,
			info.description,
		);
	}
	return Object.freeze(descriptors);
}

function createPhaseMetadata() {
	const phases: Record<string, SessionPhaseMetadata> = {};
	for (const phase of PHASES) {
		const steps = phase.steps?.map((step) => {
			const baseStep: PhaseStepMetadataEntry = {
				id: step.id,
			};
			if (step.title !== undefined) {
				baseStep.label = step.title;
			}
			if (step.icon !== undefined) {
				baseStep.icon = step.icon;
			}
			if (step.triggers && step.triggers.length > 0) {
				baseStep.triggers = [...step.triggers];
			}
			return Object.freeze(baseStep);
		});
		const phaseMetadata: SessionPhaseMetadata = { id: phase.id };
		if (phase.label !== undefined) {
			phaseMetadata.label = phase.label;
		}
		if (phase.icon !== undefined) {
			phaseMetadata.icon = phase.icon;
		}
		if (phase.action !== undefined) {
			phaseMetadata.action = phase.action;
		}
		if (steps && steps.length > 0) {
			phaseMetadata.steps = steps;
		}
		phases[phase.id] = Object.freeze(phaseMetadata);
	}
	return Object.freeze(phases);
}

function createTriggerMetadata() {
	const triggers: Record<string, SessionTriggerMetadata> = {};
	for (const [key, info] of Object.entries(TRIGGER_INFO)) {
		const descriptor: SessionTriggerMetadata = {
			label: info.past,
			icon: info.icon,
			future: info.future,
			past: info.past,
		};
		triggers[key] = Object.freeze(descriptor);
	}
	return Object.freeze(triggers);
}

function createAssetMetadata() {
	return Object.freeze({
		land: createDescriptor(LAND_INFO.label, LAND_INFO.icon),
		slot: createDescriptor(SLOT_INFO.label, SLOT_INFO.icon),
		passive: createDescriptor(PASSIVE_INFO.label, PASSIVE_INFO.icon),
	});
}

function createRegistries(): SessionRegistries {
	return Object.freeze({
		actions: createActionRegistry(),
		buildings: createBuildingRegistry(),
		developments: createDevelopmentRegistry(),
		populations: createPopulationRegistry(),
		resources: createResourceDefinitions(),
	}) as SessionRegistries;
}

const DEFAULT_REGISTRIES_INTERNAL = createRegistries();

function createMetadata(): SessionSnapshotMetadata {
	return Object.freeze({
		passiveEvaluationModifiers: {},
		resources: createResourceMetadata(),
		populations: createRegistryDescriptorMap(
			DEFAULT_REGISTRIES_INTERNAL.populations,
		),
		buildings: createRegistryDescriptorMap(
			DEFAULT_REGISTRIES_INTERNAL.buildings,
		),
		developments: createRegistryDescriptorMap(
			DEFAULT_REGISTRIES_INTERNAL.developments,
		),
		stats: createStatMetadata(),
		phases: createPhaseMetadata(),
		triggers: createTriggerMetadata(),
		assets: createAssetMetadata(),
	}) as SessionSnapshotMetadata;
}

export const DEFAULT_REGISTRIES: SessionRegistries =
	DEFAULT_REGISTRIES_INTERNAL;

export const DEFAULT_REGISTRY_METADATA: SessionSnapshotMetadata =
	createMetadata();
