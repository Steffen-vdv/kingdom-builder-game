import {
	ACTIONS,
	BUILDINGS,
	DEVELOPMENTS,
	LAND_INFO,
	OVERVIEW_CONTENT,
	PASSIVE_INFO,
	PHASES,
	POPULATION_INFO,
	POPULATIONS,
	RESOURCES,
	SLOT_INFO,
	STATS,
	TRIGGER_INFO,
} from '@kingdom-builder/contents';
import type {
	ActionConfig,
	BuildingConfig,
	DevelopmentConfig,
	PopulationConfig,
	Registry,
	SerializedRegistry,
	SessionRegistriesPayload,
	SessionResourceDefinition,
	SessionSnapshotMetadata,
	SessionMetadataDescriptor,
	SessionTriggerMetadata,
	SessionOverviewContent,
	SessionPhaseMetadata,
	SessionPhaseStepMetadata,
} from '@kingdom-builder/protocol';

type SessionResourceRegistry = SerializedRegistry<SessionResourceDefinition>;

interface SessionMetadataBuilderOptions {
	readonly actions?: Registry<ActionConfig>;
	readonly buildings?: Registry<BuildingConfig>;
	readonly developments?: Registry<DevelopmentConfig>;
	readonly populations?: Registry<PopulationConfig>;
	readonly resources?: SessionResourceRegistry;
}

function cloneRegistry<DefinitionType>(
	registry: Registry<DefinitionType>,
): SerializedRegistry<DefinitionType> {
	const entries = registry.entries();
	const result: SerializedRegistry<DefinitionType> = {};
	for (const [id, definition] of entries) {
		result[id] = structuredClone(definition);
	}
	return result;
}

function toDescriptor(definition: {
	name?: string | undefined;
	label?: string | undefined;
	description?: string | undefined;
	icon?: string | undefined;
}): SessionMetadataDescriptor {
	const descriptor: SessionMetadataDescriptor = {};
	if (definition.icon !== undefined) {
		descriptor.icon = definition.icon;
	}
	const label = definition.label ?? definition.name;
	if (label !== undefined) {
		descriptor.label = label;
	}
	if (definition.description !== undefined) {
		descriptor.description = definition.description;
	}
	return descriptor;
}

function buildDefaultResourceRegistry(): SessionResourceRegistry {
	const registry: SessionResourceRegistry = {};
	for (const [key, info] of Object.entries(RESOURCES)) {
		const definition: SessionResourceDefinition = { key: info.key };
		if (info.icon) {
			definition.icon = info.icon;
		}
		if (info.label) {
			definition.label = info.label;
		}
		if (info.description) {
			definition.description = info.description;
		}
		if (info.tags && info.tags.length > 0) {
			definition.tags = [...info.tags];
		}
		registry[key] = definition;
	}
	return registry;
}

function cloneResourceRegistry(
	registry: SessionResourceRegistry | undefined,
): SessionResourceRegistry {
	if (!registry) {
		return buildDefaultResourceRegistry();
	}
	return Object.fromEntries(
		Object.entries(registry).map(([key, definition]) => [
			key,
			structuredClone(definition),
		]),
	);
}

function buildRegistryMetadata<
	DefinitionType extends {
		name?: string | undefined;
		label?: string | undefined;
		description?: string | undefined;
		icon?: string | undefined;
	},
>(
	registry: SerializedRegistry<DefinitionType>,
): Record<string, SessionMetadataDescriptor> {
	const descriptors: Record<string, SessionMetadataDescriptor> = {};
	for (const [id, definition] of Object.entries(registry)) {
		descriptors[id] = toDescriptor(definition);
	}
	return descriptors;
}

function buildResourceMetadata(
	registry: SessionResourceRegistry,
): Record<string, SessionMetadataDescriptor> {
	const descriptors: Record<string, SessionMetadataDescriptor> = {};
	for (const [key, definition] of Object.entries(registry)) {
		const descriptor: SessionMetadataDescriptor = {};
		const resourceInfo = RESOURCES[key as keyof typeof RESOURCES];
		const icon = definition.icon ?? resourceInfo?.icon;
		if (icon !== undefined) {
			descriptor.icon = icon;
		}
		const label =
			definition.label ?? resourceInfo?.label ?? definition.key ?? key;
		descriptor.label = label;
		const description = definition.description ?? resourceInfo?.description;
		if (description !== undefined) {
			descriptor.description = description;
		}
		descriptors[key] = descriptor;
	}
	return descriptors;
}

function buildStatMetadata(): Record<string, SessionMetadataDescriptor> {
	const descriptors: Record<string, SessionMetadataDescriptor> = {};
	for (const [key, info] of Object.entries(STATS)) {
		descriptors[key] = toDescriptor(info);
	}
	return descriptors;
}

function buildPhaseMetadata(): Record<string, SessionPhaseMetadata> {
	const descriptors: Record<string, SessionPhaseMetadata> = {};
	for (const phase of PHASES) {
		const steps: SessionPhaseStepMetadata[] = phase.steps.map((step) => {
			const descriptor: SessionPhaseStepMetadata = { id: step.id };
			if (step.title !== undefined) {
				descriptor.label = step.title;
			}
			if (step.icon !== undefined) {
				descriptor.icon = step.icon;
			}
			if (step.triggers) {
				descriptor.triggers = [...step.triggers];
			}
			return descriptor;
		});
		const descriptor: SessionPhaseMetadata = { id: phase.id, steps };
		if (phase.label !== undefined) {
			descriptor.label = phase.label;
		}
		if (phase.icon !== undefined) {
			descriptor.icon = phase.icon;
		}
		if (phase.action !== undefined) {
			descriptor.action = phase.action;
		}
		descriptors[phase.id] = descriptor;
	}
	return descriptors;
}

function buildTriggerMetadata(): Record<string, SessionTriggerMetadata> {
	const descriptors: Record<string, SessionTriggerMetadata> = {};
	for (const [id, info] of Object.entries(TRIGGER_INFO)) {
		descriptors[id] = {
			icon: info.icon,
			future: info.future,
			past: info.past,
			label: info.past,
		};
	}
	return descriptors;
}

function buildAssetMetadata(): Record<string, SessionMetadataDescriptor> {
	const descriptors: Record<string, SessionMetadataDescriptor> = {
		land: toDescriptor(LAND_INFO),
		slot: toDescriptor(SLOT_INFO),
		passive: toDescriptor(PASSIVE_INFO),
		population: toDescriptor(POPULATION_INFO),
	};
	return descriptors;
}

function buildOverviewContent(): SessionOverviewContent {
	return structuredClone(OVERVIEW_CONTENT) as SessionOverviewContent;
}

export class SessionMetadataBuilder {
	private readonly registries: SessionRegistriesPayload;

	private readonly metadata: SessionSnapshotMetadata;

	public constructor(options: SessionMetadataBuilderOptions = {}) {
		const actions = cloneRegistry(options.actions ?? ACTIONS);
		const buildings = cloneRegistry(options.buildings ?? BUILDINGS);
		const developments = cloneRegistry(options.developments ?? DEVELOPMENTS);
		const populations = cloneRegistry(options.populations ?? POPULATIONS);
		const resources = cloneResourceRegistry(options.resources);
		this.registries = {
			actions,
			buildings,
			developments,
			populations,
			resources,
		};
		this.metadata = {
			passiveEvaluationModifiers: {},
			resources: buildResourceMetadata(resources),
			populations: buildRegistryMetadata(populations),
			buildings: buildRegistryMetadata(buildings),
			developments: buildRegistryMetadata(developments),
			stats: buildStatMetadata(),
			phases: buildPhaseMetadata(),
			triggers: buildTriggerMetadata(),
			assets: buildAssetMetadata(),
			overviewContent: buildOverviewContent(),
		};
	}

	public createRegistriesPayload(): SessionRegistriesPayload {
		return structuredClone(this.registries);
	}

	public createSnapshotMetadata(): SessionSnapshotMetadata {
		return structuredClone(this.metadata);
	}
}
