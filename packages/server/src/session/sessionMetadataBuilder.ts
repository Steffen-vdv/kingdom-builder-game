import {
	ACTIONS,
	BUILDINGS,
	DEVELOPMENTS,
	POPULATIONS,
	MODIFIER_INFO,
	PASSIVE_INFO,
	PHASES,
	POPULATION_INFO,
	POPULATION_ROLES,
	RESOURCES,
	STATS,
	TRIGGER_INFO,
	PhaseId,
	LAND_INFO,
	SLOT_INFO,
	DEVELOPMENTS_INFO,
	OVERVIEW_CONTENT,
	type OverviewContentTemplate,
} from '@kingdom-builder/contents';
import {
	BROOM_ICON,
	RESOURCE_TRANSFER_ICON,
} from '@kingdom-builder/contents/defs';
import type {
	PopulationConfig,
	Registry,
	SerializedRegistry,
	SessionRegistriesPayload,
	SessionResourceDefinition,
} from '@kingdom-builder/protocol';
import type {
	SessionSnapshotMetadata,
	SessionMetadataDescriptor,
	SessionPhaseMetadata,
	SessionPhaseStepMetadata,
	SessionTriggerMetadata,
} from '@kingdom-builder/protocol/session';

type RegistryDefinition<T> = SerializedRegistry<T>;

type StaticSessionMetadata = Pick<
	SessionSnapshotMetadata,
	| 'resources'
	| 'populations'
	| 'buildings'
	| 'developments'
	| 'stats'
	| 'phases'
	| 'triggers'
	| 'assets'
>;

export interface SessionMetadataBuildResult {
	readonly registries: SessionRegistriesPayload;
	readonly metadata: StaticSessionMetadata;
	readonly overviewContent: OverviewContentTemplate;
}

const deepFreeze = <T>(value: T): T => {
	if (Array.isArray(value)) {
		for (const entry of value) {
			deepFreeze(entry);
		}
		return Object.freeze(value) as unknown as T;
	}
	if (value && typeof value === 'object') {
		for (const entry of Object.values(value as Record<string, unknown>)) {
			deepFreeze(entry);
		}
		return Object.freeze(value);
	}
	return value;
};

const cloneRegistry = <DefinitionType>(
	registry: Registry<DefinitionType>,
): RegistryDefinition<DefinitionType> => {
	const entries = registry.entries();
	const result: RegistryDefinition<DefinitionType> = {};
	for (const [id, definition] of entries) {
		result[id] = structuredClone(definition);
	}
	return deepFreeze(result);
};

const buildResourceRegistry =
	(): RegistryDefinition<SessionResourceDefinition> => {
		const entries: RegistryDefinition<SessionResourceDefinition> = {};
		for (const info of Object.values(RESOURCES)) {
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
			entries[info.key] = definition;
		}
		return deepFreeze(entries);
	};

const createMetadataRecord = <T>(entries: Iterable<readonly [string, T]>) => {
	const record: Record<string, T> = {};
	for (const [id, descriptor] of entries) {
		record[id] = deepFreeze(descriptor);
	}
	return deepFreeze(record);
};

const buildResourceMetadata = () =>
	createMetadataRecord(
		Object.values(RESOURCES).map((info) => [
			info.key,
			{
				label: info.label,
				icon: info.icon,
				description: info.description,
			},
		]),
	);

const buildPopulationMetadata = () =>
	createMetadataRecord(
		Object.entries(POPULATION_ROLES).map(([id, info]) => [
			id,
			{
				label: info.label,
				icon: info.icon,
				description: info.description,
			},
		]),
	);

const buildBuildingMetadata = () =>
	createMetadataRecord(
		BUILDINGS.entries().map(([id, definition]) => {
			const descriptor: SessionMetadataDescriptor = {
				label:
					typeof (definition as { name?: unknown })?.name === 'string'
						? (definition as { name: string }).name
						: id,
			};
			const icon = (definition as { icon?: unknown })?.icon;
			if (typeof icon === 'string') {
				descriptor.icon = icon;
			}
			const description = (definition as { description?: unknown })
				?.description;
			if (typeof description === 'string') {
				descriptor.description = description;
			}
			return [id, descriptor] as const;
		}),
	);

const buildDevelopmentMetadata = () =>
	createMetadataRecord(
		DEVELOPMENTS.entries().map(([id, definition]) => {
			const descriptor: SessionMetadataDescriptor = {
				label:
					typeof (definition as { name?: unknown })?.name === 'string'
						? (definition as { name: string }).name
						: id,
			};
			const icon = (definition as { icon?: unknown })?.icon;
			if (typeof icon === 'string') {
				descriptor.icon = icon;
			}
			const description = (definition as { description?: unknown })
				?.description;
			if (typeof description === 'string') {
				descriptor.description = description;
			}
			return [id, descriptor] as const;
		}),
	);

const buildStatMetadata = () =>
	createMetadataRecord<SessionMetadataDescriptor>(
		Object.entries(STATS).map(([id, info]) => {
			const descriptor: SessionMetadataDescriptor = {
				label: info.label,
				icon: info.icon,
				description: info.description,
			};
			if (info.displayAsPercent) {
				descriptor.displayAsPercent = info.displayAsPercent;
			}
			if (info.addFormat) {
				descriptor.format = { ...info.addFormat };
			}
			return [id, descriptor] as const;
		}),
	);

const toPhaseStepMetadata = (step: unknown): SessionPhaseStepMetadata => {
	const metadata: SessionPhaseStepMetadata = {
		id: (step as { id: string }).id,
	};
	const label = (step as { title?: unknown }).title;
	if (typeof label === 'string') {
		metadata.label = label;
	}
	const icon = (step as { icon?: unknown }).icon;
	if (typeof icon === 'string') {
		metadata.icon = icon;
	}
	const triggers = (step as { triggers?: unknown }).triggers;
	if (Array.isArray(triggers)) {
		metadata.triggers = triggers.map((trigger) => String(trigger));
	}
	return metadata;
};

const buildPhaseMetadata = () =>
	createMetadataRecord(
		PHASES.map((phase) => {
			const metadata: SessionPhaseMetadata = { id: phase.id };
			if (typeof phase.label === 'string') {
				metadata.label = phase.label;
			}
			if (typeof phase.icon === 'string') {
				metadata.icon = phase.icon;
			}
			if (typeof phase.action === 'boolean') {
				metadata.action = phase.action;
			}
			if (Array.isArray(phase.steps) && phase.steps.length > 0) {
				metadata.steps = phase.steps.map(toPhaseStepMetadata);
			}
			return [phase.id, metadata] as const;
		}),
	);

const buildTriggerMetadata = () =>
	createMetadataRecord(
		Object.entries(TRIGGER_INFO).map(([id, info]) => {
			const descriptor: SessionTriggerMetadata = { label: info.past ?? id };
			if (typeof info.icon === 'string') {
				descriptor.icon = info.icon;
			}
			if (typeof info.future === 'string') {
				descriptor.future = info.future;
			}
			if (typeof info.past === 'string') {
				descriptor.past = info.past;
			}
			return [id, descriptor] as const;
		}),
	);

const buildAssetMetadata = () => {
	const descriptors: Record<string, unknown> = {};
	assignAssetDescriptor(descriptors, 'population', POPULATION_INFO);
	assignAssetDescriptor(descriptors, 'passive', PASSIVE_INFO);
	assignAssetDescriptor(descriptors, 'land', LAND_INFO);
	assignAssetDescriptor(descriptors, 'slot', SLOT_INFO);
	assignAssetDescriptor(descriptors, 'developments', DEVELOPMENTS_INFO);
	const upkeepPhase = findUpkeepPhase();
	assignAssetDescriptor(descriptors, 'upkeep', {
		label: upkeepPhase?.label ?? 'Upkeep',
		icon: upkeepPhase?.icon ?? BROOM_ICON,
	});
	assignAssetDescriptor(descriptors, 'transfer', {
		label: 'Transfer',
		icon: RESOURCE_TRANSFER_ICON,
	});
	descriptors.modifiers = deepFreeze(structuredClone(MODIFIER_INFO));
	return deepFreeze(descriptors) as Record<string, SessionMetadataDescriptor>;
};

const findUpkeepPhase = () =>
	PHASES.find((phase) => phase.id === PhaseId.Upkeep);

type AssetInfo = { icon?: string; label?: string; description?: string };

function assignAssetDescriptor(
	target: Record<string, unknown>,
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
	target[key] = deepFreeze(descriptor);
}

const cloneOverviewContent = () =>
	deepFreeze(structuredClone(OVERVIEW_CONTENT));

export const buildSessionMetadata = (): SessionMetadataBuildResult => {
	const registries: SessionRegistriesPayload = {
		actions: cloneRegistry(ACTIONS),
		buildings: cloneRegistry(BUILDINGS),
		developments: cloneRegistry(DEVELOPMENTS),
		populations: cloneRegistry(POPULATIONS as Registry<PopulationConfig>),
		resources: buildResourceRegistry(),
	};
	const metadata: StaticSessionMetadata = {
		resources: buildResourceMetadata(),
		populations: buildPopulationMetadata(),
		buildings: buildBuildingMetadata(),
		developments: buildDevelopmentMetadata(),
		stats: buildStatMetadata(),
		phases: buildPhaseMetadata(),
		triggers: buildTriggerMetadata(),
		assets: buildAssetMetadata(),
	};
	return Object.freeze({
		registries,
		metadata,
		overviewContent: cloneOverviewContent(),
	});
};
