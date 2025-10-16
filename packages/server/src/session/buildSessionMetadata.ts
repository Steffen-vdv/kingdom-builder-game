import {
	LAND_INFO,
	OVERVIEW_CONTENT,
	PASSIVE_INFO,
	SLOT_INFO,
	STATS,
	TRIGGER_INFO,
} from '@kingdom-builder/contents';
import type {
	BuildingConfig,
	DevelopmentConfig,
	PhaseConfig,
	PopulationConfig,
	Registry,
	SerializedRegistry,
	SessionMetadataDescriptor,
	SessionPhaseMetadata,
	SessionSnapshotMetadata,
	SessionTriggerMetadata,
	SessionResourceDefinition,
} from '@kingdom-builder/protocol';

type SessionMetadataDescriptorMap = Record<string, SessionMetadataDescriptor>;
type SessionPhaseStep = NonNullable<SessionPhaseMetadata['steps']>[number];

export type SessionStaticMetadataPayload = Pick<
	SessionSnapshotMetadata,
	| 'resources'
	| 'populations'
	| 'buildings'
	| 'developments'
	| 'stats'
	| 'phases'
	| 'triggers'
	| 'assets'
	| 'overview'
>;

export interface BuildSessionMetadataOptions {
	buildings: Registry<BuildingConfig>;
	developments: Registry<DevelopmentConfig>;
	populations: Registry<PopulationConfig>;
	resources: SerializedRegistry<SessionResourceDefinition>;
	phases: ReadonlyArray<PhaseConfig>;
}

/**
 * Assemble static session metadata from the provided registries and phase configurations.
 *
 * Builds descriptors for resources, populations, buildings, developments, stats, phases, triggers,
 * and assets from the supplied inputs and includes a cloned overview content.
 *
 * @param options - Input registries and phase configurations used to construct the metadata
 * @returns A `SessionStaticMetadataPayload` containing any of `resources`, `populations`, `buildings`,
 * `developments`, `stats`, `phases`, `triggers`, `assets` when those sections are non-empty, and an
 * always-present `overview` field cloned from `OVERVIEW_CONTENT`.
 */
export function buildSessionMetadata(
	options: BuildSessionMetadataOptions,
): SessionStaticMetadataPayload {
	const metadata: SessionStaticMetadataPayload = {};
	const resourceMetadata = buildResourceMetadata(options.resources);
	if (hasEntries(resourceMetadata)) {
		metadata.resources = resourceMetadata;
	}
	const populationMetadata = buildRegistryMetadata(options.populations);
	if (hasEntries(populationMetadata)) {
		metadata.populations = populationMetadata;
	}
	const buildingMetadata = buildRegistryMetadata(options.buildings);
	if (hasEntries(buildingMetadata)) {
		metadata.buildings = buildingMetadata;
	}
	const developmentMetadata = buildRegistryMetadata(options.developments);
	if (hasEntries(developmentMetadata)) {
		metadata.developments = developmentMetadata;
	}
	const statMetadata = buildStatMetadata();
	if (hasEntries(statMetadata)) {
		metadata.stats = statMetadata;
	}
	const phaseMetadata = buildPhaseMetadata(options.phases);
	if (hasEntries(phaseMetadata)) {
		metadata.phases = phaseMetadata;
	}
	const triggerMetadata = buildTriggerMetadata();
	if (hasEntries(triggerMetadata)) {
		metadata.triggers = triggerMetadata;
	}
	const assetMetadata = buildAssetMetadata();
	if (hasEntries(assetMetadata)) {
		metadata.assets = assetMetadata;
	}
	const overviewMetadata = structuredClone(OVERVIEW_CONTENT);
	metadata.overview = overviewMetadata;
	return metadata;
}

/**
 * Create metadata descriptors for serialized session resources.
 *
 * @param resources - A registry of serialized session resource definitions keyed by resource id
 * @returns A map of session metadata descriptors keyed by resource id; each descriptor includes `label`, `icon`, and `description` when present
 */
function buildResourceMetadata(
	resources: SerializedRegistry<SessionResourceDefinition>,
): SessionMetadataDescriptorMap {
	const descriptors: SessionMetadataDescriptorMap = {};
	for (const key of Object.keys(resources)) {
		const definition = resources[key];
		if (!definition) {
			continue;
		}
		const descriptor: SessionMetadataDescriptor = {};
		if (definition.label) {
			descriptor.label = definition.label;
		}
		if (definition.icon) {
			descriptor.icon = definition.icon;
		}
		if (definition.description) {
			descriptor.description = definition.description;
		}
		descriptors[key] = descriptor;
	}
	return descriptors;
}

/**
 * Create metadata descriptors from a registry of named definitions.
 *
 * @param registry - A registry whose entries are definitions containing `name` and optional `icon`
 * @returns A map of session metadata descriptors keyed by each registry id
 */
function buildRegistryMetadata<
	Definition extends { name: string; icon?: string | undefined },
>(registry: Registry<Definition>): SessionMetadataDescriptorMap {
	const descriptors: SessionMetadataDescriptorMap = {};
	for (const [id, definition] of registry.entries()) {
		const descriptor: SessionMetadataDescriptor = { label: definition.name };
		if (definition.icon) {
			descriptor.icon = definition.icon;
		}
		descriptors[id] = descriptor;
	}
	return descriptors;
}

/**
 * Builds metadata descriptors for every stat defined in STATS.
 *
 * @returns A map from stat key to a session metadata descriptor containing `label`, `description`, and optional `icon` and `displayAsPercent`
 */
function buildStatMetadata(): SessionMetadataDescriptorMap {
	const descriptors: SessionMetadataDescriptorMap = {};
	const statKeys = Object.keys(STATS) as Array<keyof typeof STATS>;
	for (const key of statKeys) {
		const info = STATS[key];
		const descriptor: SessionMetadataDescriptor = {
			label: info.label,
			description: info.description,
		};
		if (info.icon) {
			descriptor.icon = info.icon;
		}
		if (info.displayAsPercent) {
			descriptor.displayAsPercent = info.displayAsPercent;
		}
		descriptors[key] = descriptor;
	}
	return descriptors;
}

/**
 * Create metadata descriptors for session phases and their steps.
 *
 * Each phase descriptor contains the phase `id` and may include `label`, `icon`, `action`, and a `steps` array.
 * Each step descriptor contains the step `id` and may include `label`, `icon`, and `triggers`.
 *
 * @param phases - Phase configurations to convert into session metadata descriptors
 * @returns A record mapping phase id to its corresponding `SessionPhaseMetadata` descriptor
 */
function buildPhaseMetadata(
	phases: ReadonlyArray<PhaseConfig>,
): Record<string, SessionPhaseMetadata> {
	const descriptors: Record<string, SessionPhaseMetadata> = {};
	for (const phase of phases) {
		const descriptor: SessionPhaseMetadata = { id: phase.id };
		if (phase.label) {
			descriptor.label = phase.label;
		}
		if (phase.icon) {
			descriptor.icon = phase.icon;
		}
		if (phase.action) {
			descriptor.action = true;
		}
		const steps: SessionPhaseStep[] = phase.steps.map((step) => {
			const stepMetadata: SessionPhaseStep = { id: step.id };
			if (step.title) {
				stepMetadata.label = step.title;
			}
			if (step.icon) {
				stepMetadata.icon = step.icon;
			}
			if (step.triggers && step.triggers.length > 0) {
				stepMetadata.triggers = [...step.triggers];
			}
			return stepMetadata;
		});
		if (steps.length > 0) {
			descriptor.steps = steps;
		}
		descriptors[phase.id] = descriptor;
	}
	return descriptors;
}

/**
 * Create metadata descriptors for every trigger defined in TRIGGER_INFO.
 *
 * @returns A record mapping each trigger id to its corresponding SessionTriggerMetadata descriptor
 */
function buildTriggerMetadata(): Record<string, SessionTriggerMetadata> {
	const descriptors: Record<string, SessionTriggerMetadata> = {};
	const triggerKeys = Object.keys(TRIGGER_INFO) as Array<
		keyof typeof TRIGGER_INFO
	>;
	for (const key of triggerKeys) {
		descriptors[key] = buildTriggerDescriptor(TRIGGER_INFO[key]);
	}
	return descriptors;
}

/**
 * Create a trigger metadata descriptor from a trigger info entry.
 *
 * @param info - An entry from `TRIGGER_INFO` describing a trigger's presentation.
 * @returns A `SessionTriggerMetadata` object including the trigger's `icon` and optional `future` and `past` labels when present in the source info.
 */
function buildTriggerDescriptor(
	info: (typeof TRIGGER_INFO)[keyof typeof TRIGGER_INFO],
): SessionTriggerMetadata {
	const descriptor: SessionTriggerMetadata = {};
	if (info.icon) {
		descriptor.icon = info.icon;
	}
	if (info.future) {
		descriptor.future = info.future;
	}
	if (info.past) {
		descriptor.past = info.past;
	}
	return descriptor;
}

/**
 * Builds metadata descriptors for static asset categories.
 *
 * Produces descriptors for the 'passive', 'land', and 'slot' asset categories when information is available.
 *
 * @returns A map of asset descriptors keyed by category; keys appear only for categories that have descriptor information.
 */
function buildAssetMetadata(): SessionMetadataDescriptorMap {
	const descriptors: SessionMetadataDescriptorMap = {};
	assignAssetDescriptor(descriptors, 'passive', PASSIVE_INFO);
	assignAssetDescriptor(descriptors, 'land', LAND_INFO);
	assignAssetDescriptor(descriptors, 'slot', SLOT_INFO);
	return descriptors;
}

type AssetInfo = { icon?: string; label?: string; description?: string };

/**
 * Populate a session metadata map entry for an asset key when asset info is provided.
 *
 * Copies label, icon, and description from `info` into a new descriptor and assigns it to `target[key]`.
 *
 * @param target - Map of session metadata descriptors to modify
 * @param key - Property key under which to store the descriptor
 * @param info - Asset information; if `undefined` no assignment is performed
 */
function assignAssetDescriptor(
	target: SessionMetadataDescriptorMap,
	key: string,
	info: AssetInfo | undefined,
): void {
	if (!info) {
		return;
	}
	const descriptor: SessionMetadataDescriptor = {};
	if (info.label) {
		descriptor.label = info.label;
	}
	if (info.icon) {
		descriptor.icon = info.icon;
	}
	if (info.description) {
		descriptor.description = info.description;
	}
	target[key] = descriptor;
}

/**
 * Check if a record contains at least one own enumerable string-keyed property.
 *
 * @param value - The record to inspect
 * @returns `true` if `value` has at least one own enumerable string-keyed property, `false` otherwise.
 */
function hasEntries<T>(value: Record<string, T>): boolean {
	return Object.keys(value).length > 0;
}