import {
	ACTIONS,
	ACTION_CATEGORIES,
	BUILDINGS,
	DEVELOPMENTS,
	POPULATIONS,
	PHASES,
	OVERVIEW_CONTENT,
	type OverviewContentTemplate,
} from '@kingdom-builder/contents';
import type {
	Registry,
	SerializedRegistry,
	SessionRegistriesPayload,
	SessionActionCategoryRegistry,
} from '@kingdom-builder/protocol';
import type { SessionSnapshotMetadata } from '@kingdom-builder/protocol/session';
import type { SessionResourceRegistryPayload } from '@kingdom-builder/protocol/session/resourceV2';
import {
	createResourceRegistryPayload,
	freezeResourceRegistryPayload,
} from './registryUtils.js';
import {
	buildDefaultResourceDefinitions,
	buildDefaultResourceGroups,
} from './resourceRegistryDefaults.js';
import { buildSessionMetadata as buildStaticMetadata } from './buildSessionMetadata.js';

type RegistryDefinition<T> = SerializedRegistry<T>;

type StaticSessionMetadata = Pick<
	SessionSnapshotMetadata,
	'values' | 'buildings' | 'developments' | 'phases' | 'triggers' | 'assets'
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
		const entries = value as Record<string, unknown>;
		for (const key of Object.keys(entries)) {
			deepFreeze(entries[key]);
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

export const buildSessionMetadata = (): SessionMetadataBuildResult => {
	const resourceDefinitions = deepFreeze(
		buildDefaultResourceDefinitions().map((definition) => {
			const clonedDefinition = structuredClone(definition);
			return clonedDefinition;
		}),
	);
	const resourceValues: SessionResourceRegistryPayload =
		freezeResourceRegistryPayload(
			createResourceRegistryPayload(
				resourceDefinitions,
				buildDefaultResourceGroups(),
			),
		);
	const registries: SessionRegistriesPayload = {
		actions: cloneRegistry(ACTIONS),
		actionCategories: cloneActionCategoryRegistry(),
		buildings: cloneRegistry(BUILDINGS),
		developments: cloneRegistry(DEVELOPMENTS),
		populations: cloneRegistry(POPULATIONS),
		resourceValues,
	};
	const metadata = deepFreeze(
		buildStaticMetadata({
			buildings: BUILDINGS,
			developments: DEVELOPMENTS,
			resourceValues,
			phases: PHASES,
		}),
	) as StaticSessionMetadata;
	return Object.freeze({
		registries,
		metadata,
		overviewContent: deepFreeze(structuredClone(OVERVIEW_CONTENT)),
	});
};
