import {
	createContentFactory,
	toSessionActionCategoryConfig,
} from '@kingdom-builder/testing';
import type {
	SessionRegistriesPayload,
	SessionResourceDefinition,
} from '@kingdom-builder/protocol/session';
import {
	deserializeSessionRegistries,
	type SessionRegistries,
} from '../../src/state/sessionRegistries';
import registriesPayload from '../fixtures/sessionRegistriesPayload.json';

const BASE_PAYLOAD = registriesPayload as SessionRegistriesPayload;
const CATEGORY_REMAP = new Map([
	['population', 'hire'],
	['development', 'develop'],
	['building', 'build'],
]);

function createCategoryRegistry(): SessionRegistriesPayload['actionCategories'] {
	const factory = createContentFactory();
	const entries = factory.categories.entries();
	if (entries.length === 0) {
		return undefined;
	}
	return Object.fromEntries(
		entries.map(([id, definition]) => [
			id,
			toSessionActionCategoryConfig(definition),
		]),
	);
}

function normalizeActionCategories(payload: SessionRegistriesPayload): void {
	if (!payload.actions) {
		return;
	}
	for (const definition of Object.values(payload.actions)) {
		if (!definition || typeof definition !== 'object') {
			continue;
		}
		const categoryId = (definition as { category?: string }).category;
		if (!categoryId) {
			continue;
		}
		const remapped = CATEGORY_REMAP.get(categoryId);
		if (remapped) {
			(definition as { category: string }).category = remapped;
		}
	}
}
type ResourceKey = SessionResourceDefinition['key'];

function cloneResourceDefinition(
	definition: SessionResourceDefinition,
): SessionResourceDefinition {
	const clone: SessionResourceDefinition = { key: definition.key };
	if (definition.icon !== undefined) {
		clone.icon = definition.icon;
	}
	if (definition.label !== undefined) {
		clone.label = definition.label;
	}
	if (definition.description !== undefined) {
		clone.description = definition.description;
	}
	if (definition.tags && definition.tags.length > 0) {
		clone.tags = [...definition.tags];
	}
	return clone;
}

type ExtendedPayload = SessionRegistriesPayload & {
	resourceCategoriesV2?: Record<string, unknown>;
};

function cloneRegistriesPayload(
	payload: SessionRegistriesPayload,
): ExtendedPayload {
	const cloneEntries = <T>(entries: Record<string, T> | undefined) => {
		if (!entries) {
			return {};
		}
		return Object.fromEntries(
			Object.entries(entries).map(([id, definition]) => [
				id,
				structuredClone(definition),
			]),
		);
	};
	const extPayload = payload as ExtendedPayload;
	return {
		actions: cloneEntries(payload.actions),
		buildings: cloneEntries(payload.buildings),
		developments: cloneEntries(payload.developments),
		populations: cloneEntries(payload.populations),
		resources: Object.fromEntries(
			Object.entries(payload.resources ?? {}).map(([key, definition]) => [
				key,
				cloneResourceDefinition(definition),
			]),
		),
		actionCategories: cloneEntries(payload.actionCategories),
		resourcesV2: cloneEntries(payload.resourcesV2),
		resourceGroupsV2: cloneEntries(payload.resourceGroupsV2),
		resourceCategoriesV2: cloneEntries(extPayload.resourceCategoriesV2),
	};
}

export function createSessionRegistriesPayload(): SessionRegistriesPayload {
	const payload = cloneRegistriesPayload(BASE_PAYLOAD);
	normalizeActionCategories(payload);
	payload.actionCategories = createCategoryRegistry();
	return payload;
}

export function createSessionRegistries(): SessionRegistries {
	return deserializeSessionRegistries(createSessionRegistriesPayload());
}

export function createResourceKeys(): ResourceKey[] {
	return Object.keys(BASE_PAYLOAD.resources ?? {}) as ResourceKey[];
}

// Helper to create ResourceV2 catalog content for engine initialization
export function createResourceV2CatalogContent() {
	const payload = cloneRegistriesPayload(BASE_PAYLOAD);
	const resourcesV2 = payload.resourcesV2 ?? {};
	const resourceGroupsV2 = payload.resourceGroupsV2 ?? {};
	const resourceCategoriesV2 = payload.resourceCategoriesV2 ?? {};

	// Convert to ordered registry format expected by createRuntimeResourceCatalog
	const resources = {
		ordered: Object.values(resourcesV2),
		byId: resourcesV2,
	};
	const groups = {
		ordered: Object.values(resourceGroupsV2),
		byId: resourceGroupsV2,
	};
	const categories = {
		ordered: Object.values(resourceCategoriesV2),
		byId: resourceCategoriesV2,
	};

	return { resources, groups, categories };
}
