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
	ResourceV2DefinitionConfig,
	ResourceV2GroupDefinitionConfig,
} from '@kingdom-builder/protocol';
import type { SessionSnapshotMetadata } from '@kingdom-builder/protocol/session';
import { buildSessionMetadata as buildSnapshotMetadata } from './buildSessionMetadata.js';
import { buildResourceValueRegistryPayload } from './registryUtils.js';

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

const typedStructuredClone = <Value>(value: Value): Value => {
        return structuredClone(value) as Value;
};

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

const cloneRegistry = <DefinitionType>(registry: Registry<DefinitionType>) => {
        const entries = registry.entries();
        const result: RegistryDefinition<DefinitionType> = {};
        for (const [id, definition] of entries) {
                result[id] = typedStructuredClone(definition);
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

const cloneOverviewContent = () =>
        deepFreeze(typedStructuredClone(OVERVIEW_CONTENT));

const buildResourceValueRegistry = (
	definitions: Iterable<ResourceV2DefinitionConfig> = [],
	groups: Iterable<ResourceV2GroupDefinitionConfig> = [],
) => buildResourceValueRegistryPayload({ definitions, groups });

export const buildSessionMetadata = (): SessionMetadataBuildResult => {
	const resourceValues = buildResourceValueRegistry();
	const registries: SessionRegistriesPayload = deepFreeze({
		actions: cloneRegistry(ACTIONS),
		actionCategories: cloneActionCategoryRegistry(),
		buildings: cloneRegistry(BUILDINGS),
		developments: cloneRegistry(DEVELOPMENTS),
		populations: cloneRegistry(POPULATIONS),
		resourceValues,
	});
	const metadataSnapshot = buildSnapshotMetadata({
		buildings: BUILDINGS,
		developments: DEVELOPMENTS,
		resourceValues,
		phases: PHASES,
	});
	const metadata = deepFreeze(metadataSnapshot) as StaticSessionMetadata;
	return Object.freeze({
		registries,
		metadata,
		overviewContent: cloneOverviewContent(),
	});
};
