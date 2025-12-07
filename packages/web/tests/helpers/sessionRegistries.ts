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
	const clone: SessionResourceDefinition = { key: definition.resourceId };
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
	resourceCategories?: Record<string, unknown>;
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
		actionCategories: cloneEntries(payload.actionCategories),
		resources: cloneEntries(payload.resources),
		resourceGroups: cloneEntries(payload.resourceGroups),
		resourceCategories: cloneEntries(extPayload.resourceCategories),
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

// Helper to create Resource catalog content for engine initialization
export function createResourceCatalogContent() {
	const payload = cloneRegistriesPayload(BASE_PAYLOAD);
	const resourcesMap = payload.resources ?? {};
	const resourceGroupsMap = payload.resourceGroups ?? {};
	const resourceCategoriesMap = payload.resourceCategories ?? {};

	// Convert to ordered registry format expected by createRuntimeResourceCatalog
	const resources = {
		ordered: Object.values(resourcesMap),
		byId: resourcesMap,
	};
	const groups = {
		ordered: Object.values(resourceGroupsMap),
		byId: resourceGroupsMap,
	};
	const categories = {
		ordered: Object.values(resourceCategoriesMap),
		byId: resourceCategoriesMap,
	};

	return { resources, groups, categories };
}
