import {
	ACTIONS,
	BUILDINGS,
	DEVELOPMENTS,
	DEVELOPMENTS_INFO,
	GAME_START,
	LAND_INFO,
	MODIFIER_INFO,
	OVERVIEW_CONTENT,
	PASSIVE_INFO,
	PHASES,
	POPULATION_ARCHETYPE_INFO,
	POPULATION_INFO,
	POPULATIONS,
	RESOURCES,
	SLOT_INFO,
	STATS,
	TRIGGER_INFO,
	type OverviewContentTemplate,
	type PhaseDef,
} from '@kingdom-builder/contents';
import type {
	ActionConfig,
	BuildingConfig,
	DevelopmentConfig,
	PlayerStartConfig,
	PopulationConfig,
	Registry,
	SerializedRegistry,
	StartConfig,
} from '@kingdom-builder/protocol';
import type {
	SessionMetadataDescriptor,
	SessionPhaseMetadata,
	SessionPhaseStepMetadata,
	SessionRegistriesPayload,
	SessionResourceDefinition,
	SessionSnapshotMetadata,
	SessionTriggerMetadata,
} from '@kingdom-builder/protocol/session';
import { deepFreeze, freezeClone } from '../utils/deepFreeze.js';

type SessionRegistrySource<TDefinition> = Registry<TDefinition>;

type SessionResourceRegistry = SerializedRegistry<SessionResourceDefinition>;

type DescriptorSource = Partial<
	Record<'label' | 'name' | 'icon' | 'description', string | undefined>
>;

type ResourceInfo = (typeof RESOURCES)[keyof typeof RESOURCES];

export interface SessionMetadataBuilderOptions {
	readonly actions?: SessionRegistrySource<ActionConfig>;
	readonly buildings?: SessionRegistrySource<BuildingConfig>;
	readonly developments?: SessionRegistrySource<DevelopmentConfig>;
	readonly populations?: SessionRegistrySource<PopulationConfig>;
	readonly phases?: readonly PhaseDef[];
	readonly startConfig?: StartConfig;
	readonly resourceRegistry?: SessionResourceRegistry;
	readonly overviewContent?: OverviewContentTemplate;
}

export interface SessionMetadataBuildResult {
	readonly registries: SessionRegistriesPayload;
	readonly metadata: Partial<SessionSnapshotMetadata>;
	readonly overviewContent: OverviewContentTemplate;
}

function cloneRegistry<DefinitionType>(
	registry: SessionRegistrySource<DefinitionType>,
): SerializedRegistry<DefinitionType> {
	const entries = Array.from(
		registry.entries(),
		([id, definition]) => [id, freezeClone(definition)] as const,
	);
	return Object.freeze(Object.fromEntries(entries));
}

function createResourceDefinitionFromInfo(
	info: ResourceInfo,
): SessionResourceDefinition {
	const definition: SessionResourceDefinition = { key: info.key };
	if (info.icon !== undefined) {
		definition.icon = info.icon;
	}
	if (info.label !== undefined) {
		definition.label = info.label;
	}
	if (info.description !== undefined) {
		definition.description = info.description;
	}
	if (info.tags && info.tags.length > 0) {
		definition.tags = [...info.tags];
	}
	return deepFreeze(definition);
}

function buildResourceRegistry(
	overrides: SessionResourceRegistry | undefined,
	start: StartConfig,
): SessionResourceRegistry {
	const registry = new Map<string, SessionResourceDefinition>();
	for (const info of Object.values(RESOURCES)) {
		registry.set(info.key, createResourceDefinitionFromInfo(info));
	}
	if (overrides) {
		for (const [key, definition] of Object.entries(overrides)) {
			registry.set(key, freezeClone(definition));
		}
	}
	const ensureKey = (key: string) => {
		if (registry.has(key)) {
			return;
		}
		const info = (RESOURCES as Record<string, ResourceInfo | undefined>)[key];
		if (info) {
			registry.set(key, createResourceDefinitionFromInfo(info));
			return;
		}
		const fallback: SessionResourceDefinition = { key };
		registry.set(key, deepFreeze(fallback));
	};
	const includeStartResources = (config: PlayerStartConfig | undefined) => {
		if (!config?.resources) {
			return;
		}
		for (const key of Object.keys(config.resources)) {
			ensureKey(key);
		}
	};
	includeStartResources(start.player);
	if (start.players) {
		for (const config of Object.values(start.players)) {
			includeStartResources(config);
		}
	}
	if (start.modes) {
		for (const mode of Object.values(start.modes)) {
			if (!mode) {
				continue;
			}
			includeStartResources(mode.player);
			if (mode.players) {
				for (const config of Object.values(mode.players)) {
					includeStartResources(config);
				}
			}
		}
	}
	return deepFreeze(Object.fromEntries(registry)) as SessionResourceRegistry;
}

function buildDescriptor(
	source: DescriptorSource,
	fallback: string,
): SessionMetadataDescriptor {
	const descriptor: SessionMetadataDescriptor = {};
	const label = source.label ?? source.name ?? fallback;
	if (label) {
		descriptor.label = label;
	}
	if (source.icon !== undefined) {
		descriptor.icon = source.icon;
	}
	if (source.description !== undefined) {
		descriptor.description = source.description;
	}
	return deepFreeze(descriptor);
}

function buildRegistryMetadata<
	DefinitionType extends {
		id: string;
		name?: string | undefined;
		icon?: string | undefined;
		description?: string | undefined;
	},
>(
	registry: SessionRegistrySource<DefinitionType>,
): Record<string, SessionMetadataDescriptor> {
	const entries = Array.from(
		registry.entries(),
		([id, definition]) => [id, buildDescriptor(definition, id)] as const,
	);
	return Object.freeze(Object.fromEntries(entries));
}

interface InfoDescriptor {
	key: string;
	label?: string;
	icon?: string;
	description?: string;
}

function createInfoDescriptorRecord<TInfo extends InfoDescriptor>(
	infoList: Iterable<TInfo>,
	extra?: (info: TInfo) => Record<string, unknown> | undefined,
): Record<string, SessionMetadataDescriptor> {
	const entries: Array<[string, SessionMetadataDescriptor]> = [];
	for (const info of infoList) {
		const descriptor: Record<string, unknown> = {};
		if (info.label !== undefined) {
			descriptor.label = info.label;
		}
		if (info.icon !== undefined) {
			descriptor.icon = info.icon;
		}
		if (info.description !== undefined) {
			descriptor.description = info.description;
		}
		const extras = extra?.(info);
		if (extras) {
			Object.assign(descriptor, extras);
		}
		entries.push([
			info.key,
			deepFreeze(descriptor) as SessionMetadataDescriptor,
		]);
	}
	return Object.freeze(Object.fromEntries(entries));
}

function buildPhaseMetadata(
	phases: readonly PhaseDef[],
): Record<string, SessionPhaseMetadata> {
	const result: Record<string, SessionPhaseMetadata> = {};
	for (const phase of phases) {
		const descriptor: SessionPhaseMetadata = { id: phase.id };
		if (phase.label !== undefined) {
			descriptor.label = phase.label;
		}
		if (phase.icon !== undefined) {
			descriptor.icon = phase.icon;
		}
		if (phase.action !== undefined) {
			descriptor.action = phase.action;
		}
		if (phase.steps.length > 0) {
			const steps = Object.freeze(
				phase.steps.map((step) => {
					const stepDescriptor: SessionPhaseStepMetadata = {
						id: step.id,
					};
					if (step.title !== undefined) {
						stepDescriptor.label = step.title;
					}
					if (step.icon !== undefined) {
						stepDescriptor.icon = step.icon;
					}
					if (step.triggers && step.triggers.length > 0) {
						stepDescriptor.triggers = [...step.triggers];
					}
					return deepFreeze(stepDescriptor);
				}),
			) as unknown as SessionPhaseStepMetadata[];
			descriptor.steps = steps;
		}
		result[phase.id] = deepFreeze(descriptor);
	}
	return Object.freeze(result);
}

function buildTriggerMetadata(): Record<string, SessionTriggerMetadata> {
	const entries = Object.entries(TRIGGER_INFO).map(([id, info]) => {
		const descriptor: SessionTriggerMetadata = {
			icon: info.icon,
			future: info.future,
			past: info.past,
			label: info.past,
		};
		return [id, deepFreeze(descriptor)] as const;
	});
	return Object.freeze(Object.fromEntries(entries));
}

function buildAssetMetadata(): Record<string, SessionMetadataDescriptor> {
	const baseInfo: Record<string, DescriptorSource> = {
		land: LAND_INFO,
		slot: SLOT_INFO,
		passive: PASSIVE_INFO,
		population: POPULATION_INFO,
		populationArchetype: POPULATION_ARCHETYPE_INFO,
		developments: DEVELOPMENTS_INFO,
	};
	const entries: Array<[string, SessionMetadataDescriptor]> = [];
	for (const [id, info] of Object.entries(baseInfo)) {
		entries.push([id, buildDescriptor(info, id)]);
	}
	const modifierEntries = Object.entries(MODIFIER_INFO) as Array<
		readonly [
			keyof typeof MODIFIER_INFO,
			(typeof MODIFIER_INFO)[keyof typeof MODIFIER_INFO],
		]
	>;
	for (const [id, info] of modifierEntries) {
		const modifierId = String(id);
		entries.push([`modifier:${modifierId}`, buildDescriptor(info, modifierId)]);
	}
	return Object.freeze(Object.fromEntries(entries));
}

export function buildSessionMetadata(
	options: SessionMetadataBuilderOptions = {},
): SessionMetadataBuildResult {
	const actions = options.actions ?? ACTIONS;
	const buildings = options.buildings ?? BUILDINGS;
	const developments = options.developments ?? DEVELOPMENTS;
	const populations = options.populations ?? POPULATIONS;
	const phases = options.phases ?? PHASES;
	const startConfig = options.startConfig ?? GAME_START;
	const registries: SessionRegistriesPayload = {
		actions: cloneRegistry(actions),
		buildings: cloneRegistry(buildings),
		developments: cloneRegistry(developments),
		populations: cloneRegistry(populations),
		resources: buildResourceRegistry(options.resourceRegistry, startConfig),
	};
	const metadata: Partial<SessionSnapshotMetadata> = {
		resources: createInfoDescriptorRecord(Object.values(RESOURCES)),
		populations: buildRegistryMetadata(populations),
		buildings: buildRegistryMetadata(buildings),
		developments: buildRegistryMetadata(developments),
		stats: createInfoDescriptorRecord(Object.values(STATS), (info) => {
			const extras: Record<string, unknown> = {};
			if (info.displayAsPercent !== undefined) {
				extras.displayAsPercent = info.displayAsPercent;
			}
			if (info.addFormat !== undefined) {
				extras.format = { ...info.addFormat };
			}
			return extras;
		}),
		phases: buildPhaseMetadata(phases),
		triggers: buildTriggerMetadata(),
		assets: buildAssetMetadata(),
	};
	return {
		registries: deepFreeze(registries),
		metadata: deepFreeze(metadata),
		overviewContent: freezeClone(options.overviewContent ?? OVERVIEW_CONTENT),
	};
}
