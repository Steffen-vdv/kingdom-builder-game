import {
	LAND_INFO,
	SLOT_INFO,
	PASSIVE_INFO,
	DEVELOPMENTS_INFO,
	TRIGGER_INFO,
	STATS,
	OVERVIEW_CONTENT,
} from '@kingdom-builder/contents';
import type {
	Registry,
	SessionMetadataDescriptor,
	SessionOverviewMetadata,
	SessionPhaseMetadata,
	SessionPhaseStepMetadata,
	SessionResourceDefinition,
	SessionSnapshotMetadata,
	SessionTriggerMetadata,
	BuildingConfig,
	DevelopmentConfig,
	PhaseConfig,
	PopulationConfig,
} from '@kingdom-builder/protocol';
import { cloneValue } from '../utils/structuredClone.js';

export interface SessionMetadataSource {
	readonly populations: Registry<PopulationConfig>;
	readonly buildings: Registry<BuildingConfig>;
	readonly developments: Registry<DevelopmentConfig>;
	readonly phases: PhaseConfig[];
	readonly resources: Record<string, SessionResourceDefinition>;
}

export function createSessionMetadata(
	options: SessionMetadataSource,
): SessionSnapshotMetadata {
	const metadata: SessionSnapshotMetadata = {
		passiveEvaluationModifiers: {},
	};
	const resources = buildResourceMetadata(options.resources);
	if (resources) {
		metadata.resources = resources;
	}
	const populations = buildRegistryMetadata(options.populations);
	if (populations) {
		metadata.populations = populations;
	}
	const buildings = buildRegistryMetadata(options.buildings);
	if (buildings) {
		metadata.buildings = buildings;
	}
	const developments = buildRegistryMetadata(options.developments);
	if (developments) {
		metadata.developments = developments;
	}
	const stats = buildStatMetadata();
	if (stats) {
		metadata.stats = stats;
	}
	const phases = buildPhaseMetadata(options.phases);
	if (phases) {
		metadata.phases = phases;
	}
	const triggers = buildTriggerMetadata();
	if (triggers) {
		metadata.triggers = triggers;
	}
	const assets = buildAssetMetadata();
	if (assets) {
		metadata.assets = assets;
	}
	const overview = buildOverviewMetadata();
	if (overview) {
		metadata.overview = overview;
	}
	return metadata;
}

function buildResourceMetadata(
	resources: Record<string, SessionResourceDefinition>,
): Record<string, SessionMetadataDescriptor> | undefined {
	const descriptors: Record<string, SessionMetadataDescriptor> = {};
	let hasEntry = false;
	for (const [key, definition] of Object.entries(resources)) {
		descriptors[key] = createDescriptor(
			resolveLabel(definition as unknown),
			resolveIcon(definition as unknown),
			resolveDescription(definition as unknown),
		);
		hasEntry = true;
	}
	return hasEntry ? descriptors : undefined;
}

function buildRegistryMetadata<DefinitionType>(
	registry: Registry<DefinitionType>,
): Record<string, SessionMetadataDescriptor> | undefined {
	const descriptors: Record<string, SessionMetadataDescriptor> = {};
	let hasEntry = false;
	for (const [id, definition] of registry.entries()) {
		descriptors[id] = createDescriptor(
			resolveLabel(definition as unknown),
			resolveIcon(definition as unknown),
			resolveDescription(definition as unknown),
		);
		hasEntry = true;
	}
	return hasEntry ? descriptors : undefined;
}

function buildStatMetadata():
	| Record<string, SessionMetadataDescriptor>
	| undefined {
	const descriptors: Record<string, SessionMetadataDescriptor> = {};
	let hasEntry = false;
	for (const [key, info] of Object.entries(STATS)) {
		descriptors[key] = createDescriptor(
			info.label,
			info.icon,
			info.description,
		);
		hasEntry = true;
	}
	return hasEntry ? descriptors : undefined;
}

function buildPhaseMetadata(
	phases: PhaseConfig[] | undefined,
): Record<string, SessionPhaseMetadata> | undefined {
	if (!phases || phases.length === 0) {
		return undefined;
	}
	const descriptors: Record<string, SessionPhaseMetadata> = {};
	for (const phase of phases) {
		const metadata: SessionPhaseMetadata = { id: phase.id };
		if (phase.label !== undefined) {
			metadata.label = phase.label;
		}
		if (phase.icon !== undefined) {
			metadata.icon = phase.icon;
		}
		if (phase.action !== undefined) {
			metadata.action = phase.action;
		}
		if (phase.steps && phase.steps.length > 0) {
			metadata.steps = phase.steps.map((step) => {
				const stepMetadata: SessionPhaseStepMetadata = { id: step.id };
				if (step.title !== undefined) {
					stepMetadata.label = step.title;
				}
				if (step.icon !== undefined) {
					stepMetadata.icon = step.icon;
				}
				if (step.triggers && step.triggers.length > 0) {
					stepMetadata.triggers = [...step.triggers];
				}
				return stepMetadata;
			});
		}
		descriptors[phase.id] = metadata;
	}
	return descriptors;
}

function buildTriggerMetadata():
	| Record<string, SessionTriggerMetadata>
	| undefined {
	const descriptors: Record<string, SessionTriggerMetadata> = {};
	let hasEntry = false;
	for (const [key, info] of Object.entries(TRIGGER_INFO)) {
		descriptors[key] = {
			label: info.past,
			icon: info.icon,
			future: info.future,
			past: info.past,
		};
		hasEntry = true;
	}
	return hasEntry ? descriptors : undefined;
}

function buildAssetMetadata():
	| Record<string, SessionMetadataDescriptor>
	| undefined {
	return {
		land: createDescriptor(LAND_INFO.label, LAND_INFO.icon),
		slot: createDescriptor(SLOT_INFO.label, SLOT_INFO.icon),
		passive: createDescriptor(PASSIVE_INFO.label, PASSIVE_INFO.icon),
		developments: createDescriptor(
			DEVELOPMENTS_INFO?.label,
			DEVELOPMENTS_INFO?.icon,
		),
	};
}

function buildOverviewMetadata(): SessionOverviewMetadata | undefined {
	if (!OVERVIEW_CONTENT) {
		return undefined;
	}
	return cloneValue(OVERVIEW_CONTENT);
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
	return descriptor;
}

function resolveLabel(source: unknown): string | undefined {
	if (source && typeof source === 'object') {
		const record = source as Record<string, unknown>;
		const name = record.name;
		if (typeof name === 'string') {
			return name;
		}
		const label = record.label;
		if (typeof label === 'string') {
			return label;
		}
	}
	return undefined;
}

function resolveIcon(source: unknown): string | undefined {
	if (source && typeof source === 'object') {
		const record = source as Record<string, unknown>;
		const icon = record.icon;
		if (typeof icon === 'string') {
			return icon;
		}
	}
	return undefined;
}

function resolveDescription(source: unknown): string | undefined {
	if (source && typeof source === 'object') {
		const record = source as Record<string, unknown>;
		const description = record.description;
		if (typeof description === 'string') {
			return description;
		}
	}
	return undefined;
}
