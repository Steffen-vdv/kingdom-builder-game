import {
	ACTIONS,
	ACTION_CATEGORIES,
	BUILDINGS,
	DEVELOPMENTS,
	POPULATIONS,
	PHASES,
	TRIGGER_INFO,
	LAND_INFO,
	SLOT_INFO,
	PASSIVE_INFO,
	POPULATION_INFO,
	DEVELOPMENTS_INFO,
	OVERVIEW_CONTENT,
	type OverviewContentTemplate,
} from '@kingdom-builder/contents';
import type {
	Registry,
	SerializedRegistry,
	SessionRegistriesPayload,
	SessionActionCategoryRegistry,
} from '@kingdom-builder/protocol';
import type {
	SessionSnapshotMetadata,
	SessionMetadataDescriptor,
	SessionPhaseMetadata,
	SessionPhaseStepMetadata,
	SessionTriggerMetadata,
} from '@kingdom-builder/protocol/session';
import {
	buildResourceValueMetadata as createResourceValueMetadata,
	deepFreeze,
} from './resourceValueMetadata.js';

type RegistryDefinition<T> = SerializedRegistry<T>;

type StaticSessionMetadata = Pick<
	SessionSnapshotMetadata,
	| 'values'
	| 'buildings'
	| 'developments'
	| 'phases'
	| 'triggers'
	| 'assets'
	| 'overview'
>;

export interface SessionMetadataBuildResult {
	readonly registries: SessionRegistriesPayload;
	readonly metadata: StaticSessionMetadata;
	readonly overviewContent: OverviewContentTemplate;
}

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

const cloneActionCategoryRegistry = (): SessionActionCategoryRegistry => {
	const entries: SessionActionCategoryRegistry = {};
	for (const [id, definition] of ACTION_CATEGORIES.entries()) {
		const entry: SessionActionCategoryRegistry[string] = {
			id: definition.id,
			title: definition.label,
			subtitle: definition.subtitle ?? definition.label,
			icon: definition.icon,
			order: definition.order,
			layout: definition.layout,
		};
		if (definition.description) {
			entry.description = definition.description;
		}
		if (definition.hideWhenEmpty) {
			entry.hideWhenEmpty = definition.hideWhenEmpty;
		}
		if (definition.analyticsKey) {
			entry.analyticsKey = definition.analyticsKey;
		}
		entries[id] = deepFreeze(entry);
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

const buildAssetMetadata = () =>
	createMetadataRecord([
		[
			'population',
			{ label: POPULATION_INFO.label, icon: POPULATION_INFO.icon },
		],
		['land', { label: LAND_INFO.label, icon: LAND_INFO.icon }],
		['slot', { label: SLOT_INFO.label, icon: SLOT_INFO.icon }],
		['passive', { label: PASSIVE_INFO.label, icon: PASSIVE_INFO.icon }],
		[
			'developments',
			{
				label: DEVELOPMENTS_INFO.label,
				icon: DEVELOPMENTS_INFO.icon,
			},
		],
	]);

const cloneOverviewContent = () =>
	deepFreeze(structuredClone(OVERVIEW_CONTENT));

const EMPTY_RESOURCE_REGISTRY: SessionRegistriesPayload['resourceValues'] =
	Object.freeze({
		definitions: Object.freeze({}),
		groups: Object.freeze({}),
		globalActionCost: null,
	});

export const buildSessionMetadata = (): SessionMetadataBuildResult => {
	const registries: SessionRegistriesPayload = {
		actions: cloneRegistry(ACTIONS),
		actionCategories: cloneActionCategoryRegistry(),
		buildings: cloneRegistry(BUILDINGS),
		developments: cloneRegistry(DEVELOPMENTS),
		populations: cloneRegistry(POPULATIONS),
		resourceValues: EMPTY_RESOURCE_REGISTRY,
	};

	const metadata: StaticSessionMetadata = {
		buildings: buildBuildingMetadata(),
		developments: buildDevelopmentMetadata(),
		phases: buildPhaseMetadata(),
		triggers: buildTriggerMetadata(),
		assets: buildAssetMetadata(),
		overview: cloneOverviewContent(),
	};
	const values = createResourceValueMetadata([], []);
	if (values) {
		metadata.values = values;
	}
	const overviewContent = cloneOverviewContent();
	return Object.freeze({
		registries,
		metadata: deepFreeze(metadata),
		overviewContent,
	});
};

export { buildResourceValueMetadata } from './resourceValueMetadata.js';
