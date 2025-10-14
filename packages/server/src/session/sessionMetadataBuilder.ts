import {
	ACTIONS,
	BUILDINGS,
	DEVELOPMENTS,
	POPULATIONS,
	RESOURCES,
	STATS,
	PHASES,
	TRIGGER_INFO,
	LAND_INFO,
	SLOT_INFO,
	DEVELOPMENTS_INFO,
	POPULATION_INFO,
	POPULATION_ARCHETYPE_INFO,
	PASSIVE_INFO,
	OVERVIEW_CONTENT,
} from '@kingdom-builder/contents';
import type {
	Registry,
	SerializedRegistry,
	SessionRegistriesPayload,
	SessionResourceDefinition,
} from '@kingdom-builder/protocol';
import type {
	SessionMetadataDescriptor,
	SessionPhaseMetadata,
	SessionPhaseStepMetadata,
	SessionSnapshotMetadata,
	SessionTriggerMetadata,
} from '@kingdom-builder/protocol/session';
import type { OverviewContentTemplate } from '@kingdom-builder/contents';

type StaticMetadata = Pick<
	SessionSnapshotMetadata,
	| 'resources'
	| 'populations'
	| 'buildings'
	| 'developments'
	| 'stats'
	| 'phases'
	| 'triggers'
	| 'assets'
> & {
	passiveEvaluationModifiers: SessionSnapshotMetadata['passiveEvaluationModifiers'];
};

export interface SessionMetadataBundle {
	readonly registries: Readonly<SessionRegistriesPayload>;
	readonly metadata: Readonly<StaticMetadata>;
	readonly overviewContent: Readonly<OverviewContentTemplate>;
}

type DescriptorSource = {
	readonly label?: string;
	readonly icon?: string;
	readonly description?: string;
};

type StatMetadataDescriptor = SessionMetadataDescriptor & {
	displayAsPercent?: boolean;
	format?: { prefix?: string; percent?: boolean };
	capacity?: boolean;
};

type SessionResourceRegistryPayload =
	SerializedRegistry<SessionResourceDefinition>;

const emptyPassiveModifiers = Object.freeze({});

function deepFreeze<T>(value: T): T {
	if (Array.isArray(value)) {
		const entries = value as unknown[];
		for (const entry of entries) {
			deepFreeze(entry);
		}
		Object.freeze(entries);
		return value;
	}
	if (value && typeof value === 'object') {
		const entries = value as Record<string, unknown>;
		for (const entry of Object.values(entries)) {
			deepFreeze(entry);
		}
		Object.freeze(entries);
		return value;
	}
	return value;
}

function freezeRecord<TValue>(
	record: Record<string, TValue>,
): Readonly<Record<string, TValue>> {
	return Object.freeze(record);
}

function cloneRegistry<DefinitionType>(
	registry: Registry<DefinitionType>,
): SerializedRegistry<DefinitionType> {
	const entries = registry.entries();
	const serialized: Record<string, DefinitionType> = {};
	for (const [id, definition] of entries) {
		serialized[id] = deepFreeze(structuredClone(definition));
	}
	return Object.freeze(serialized);
}

function cloneResourceRegistry(): SessionResourceRegistryPayload {
	const record: Record<string, SessionResourceDefinition> = {};
	for (const [key, info] of Object.entries(RESOURCES)) {
		const definition: SessionResourceDefinition = {
			key: info.key ?? key,
			icon: info.icon,
			label: info.label,
			description: info.description,
		};
		if (info.tags && info.tags.length > 0) {
			definition.tags = [...info.tags];
		}
		record[key] = deepFreeze(definition);
	}
	return Object.freeze(record);
}

function createDescriptor(source: DescriptorSource): SessionMetadataDescriptor {
	const descriptor: SessionMetadataDescriptor = {};
	if (source.label !== undefined) {
		descriptor.label = source.label;
	}
	if (source.icon !== undefined) {
		descriptor.icon = source.icon;
	}
	if (source.description !== undefined) {
		descriptor.description = source.description;
	}
	return deepFreeze(descriptor);
}

function createDefinitionDescriptor(
	definition: {
		readonly name?: string | undefined;
		readonly label?: string | undefined;
		readonly icon?: string | undefined;
		readonly description?: string | undefined;
	},
	fallbackId: string,
): SessionMetadataDescriptor {
	const descriptor: SessionMetadataDescriptor = {};
	const label = definition.name ?? definition.label ?? fallbackId;
	if (label !== undefined) {
		descriptor.label = label;
	}
	if (definition.icon !== undefined) {
		descriptor.icon = definition.icon;
	}
	if (definition.description !== undefined) {
		descriptor.description = definition.description;
	}
	return deepFreeze(descriptor);
}

function createStatDescriptor(
	info: (typeof STATS)[keyof typeof STATS],
): StatMetadataDescriptor {
	const descriptor: StatMetadataDescriptor = {};
	if (info.label !== undefined) {
		descriptor.label = info.label;
	}
	if (info.icon !== undefined) {
		descriptor.icon = info.icon;
	}
	if (info.description !== undefined) {
		descriptor.description = info.description;
	}
	if (info.displayAsPercent !== undefined) {
		descriptor.displayAsPercent = info.displayAsPercent;
	}
	if (info.addFormat !== undefined) {
		descriptor.format = deepFreeze({ ...info.addFormat });
	}
	if (info.capacity !== undefined) {
		descriptor.capacity = info.capacity;
	}
	return deepFreeze(descriptor);
}

function formatIdentifier(identifier: string): string {
	const spaced = identifier
		.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
		.replace(/[_-]+/g, ' ')
		.trim();
	if (spaced.length === 0) {
		return identifier;
	}
	return spaced.replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildPhaseMetadata(): Readonly<Record<string, SessionPhaseMetadata>> {
	const phases: Record<string, SessionPhaseMetadata> = {};
	for (const phase of PHASES) {
		const steps: SessionPhaseStepMetadata[] = [];
		if (Array.isArray(phase.steps)) {
			for (const step of phase.steps) {
				const stepMetadata: SessionPhaseStepMetadata = {
					id: step.id,
				};
				if (step.title !== undefined) {
					stepMetadata.label = step.title;
				}
				if (step.icon !== undefined) {
					stepMetadata.icon = step.icon;
				}
				if (Array.isArray(step.triggers) && step.triggers.length > 0) {
					stepMetadata.triggers = [...step.triggers];
				}
				steps.push(deepFreeze(stepMetadata));
			}
		}
		const metadata: SessionPhaseMetadata = {
			id: phase.id,
			action: Boolean(phase.action),
			steps,
		};
		if (phase.label !== undefined) {
			metadata.label = phase.label;
		}
		if (phase.icon !== undefined) {
			metadata.icon = phase.icon;
		}
		phases[phase.id] = deepFreeze(metadata);
	}
	return freezeRecord(phases);
}

function buildTriggerMetadata(): Readonly<
	Record<string, SessionTriggerMetadata>
> {
	const triggers: Record<string, SessionTriggerMetadata> = {};
	for (const [id, info] of Object.entries(TRIGGER_INFO)) {
		const metadata: SessionTriggerMetadata = {
			label: info.past,
			icon: info.icon,
			future: info.future,
			past: info.past,
		};
		triggers[id] = deepFreeze(metadata);
	}
	const known = new Set(Object.keys(triggers));
	for (const phase of PHASES) {
		if (!Array.isArray(phase.steps)) {
			continue;
		}
		for (const step of phase.steps) {
			if (!Array.isArray(step.triggers)) {
				continue;
			}
			for (const triggerId of step.triggers) {
				if (known.has(triggerId)) {
					continue;
				}
				const metadata: SessionTriggerMetadata = {
					label: formatIdentifier(triggerId),
				};
				triggers[triggerId] = deepFreeze(metadata);
				known.add(triggerId);
			}
		}
	}
	return freezeRecord(triggers);
}

function buildAssetDescriptors(): Readonly<
	Record<string, SessionMetadataDescriptor>
> {
	const assets: Record<string, SessionMetadataDescriptor> = {};
	assets.land = createDescriptor(LAND_INFO);
	assets.slot = createDescriptor(SLOT_INFO);
	assets.developments = createDescriptor(DEVELOPMENTS_INFO);
	assets.population = createDescriptor(POPULATION_INFO);
	assets.populationArchetypes = createDescriptor(POPULATION_ARCHETYPE_INFO);
	assets.passive = createDescriptor(PASSIVE_INFO);
	return freezeRecord(assets);
}

export function buildSessionMetadata(): SessionMetadataBundle {
	const registries: SessionRegistriesPayload = {
		actions: cloneRegistry(ACTIONS),
		buildings: cloneRegistry(BUILDINGS),
		developments: cloneRegistry(DEVELOPMENTS),
		populations: cloneRegistry(POPULATIONS),
		resources: cloneResourceRegistry(),
	};
	const resourceDescriptors: Record<string, SessionMetadataDescriptor> = {};
	for (const [key, info] of Object.entries(RESOURCES)) {
		resourceDescriptors[key] = createDescriptor(info);
	}
	const populationDescriptors: Record<string, SessionMetadataDescriptor> = {};
	for (const [id, definition] of POPULATIONS.entries()) {
		populationDescriptors[id] = createDefinitionDescriptor(definition, id);
	}
	const buildingDescriptors: Record<string, SessionMetadataDescriptor> = {};
	for (const [id, definition] of BUILDINGS.entries()) {
		buildingDescriptors[id] = createDefinitionDescriptor(definition, id);
	}
	const developmentDescriptors: Record<string, SessionMetadataDescriptor> = {};
	for (const [id, definition] of DEVELOPMENTS.entries()) {
		developmentDescriptors[id] = createDefinitionDescriptor(definition, id);
	}
	const statDescriptors: Record<string, StatMetadataDescriptor> = {};
	for (const [key, info] of Object.entries(STATS)) {
		statDescriptors[key] = createStatDescriptor(info);
	}
	const metadata: StaticMetadata = {
		passiveEvaluationModifiers: emptyPassiveModifiers,
		resources: freezeRecord(resourceDescriptors),
		populations: freezeRecord(populationDescriptors),
		buildings: freezeRecord(buildingDescriptors),
		developments: freezeRecord(developmentDescriptors),
		stats: freezeRecord(statDescriptors),
		phases: buildPhaseMetadata(),
		triggers: buildTriggerMetadata(),
		assets: buildAssetDescriptors(),
	};
	const overviewContent = deepFreeze(
		structuredClone(OVERVIEW_CONTENT),
	) as Readonly<OverviewContentTemplate>;
	const bundle: SessionMetadataBundle = {
		registries: Object.freeze(registries),
		metadata: Object.freeze(metadata),
		overviewContent,
	};
	return Object.freeze(bundle);
}
