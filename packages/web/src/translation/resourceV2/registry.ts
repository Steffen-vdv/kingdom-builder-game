import type {
	ResourceV2Definition,
	ResourceV2GroupDefinition,
	ResourceV2GroupParentDescriptor,
} from '@kingdom-builder/protocol';
import type {
	TranslationResourceV2Parent,
	TranslationResourceV2Registry,
	TranslationResourceV2Resource,
} from '../context';

function cloneValue<T>(value: T): T {
	if (value === undefined || value === null) {
		return value;
	}
	if (typeof structuredClone === 'function') {
		return structuredClone(value);
	}
	return JSON.parse(JSON.stringify(value)) as T;
}

function deepFreeze<T>(value: T): T {
	if (!value || typeof value !== 'object') {
		return value;
	}
	if (Object.isFrozen(value)) {
		return value;
	}
	Object.freeze(value);
	for (const key of Object.keys(value as Record<string, unknown>)) {
		const nested = (value as Record<string, unknown>)[key];
		if (nested && typeof nested === 'object') {
			deepFreeze(nested);
		}
	}
	return value;
}

function freezeClone<T>(value: T): T {
	return deepFreeze(cloneValue(value));
}

function freezeOptional<T>(value: T | undefined): T | undefined {
	if (value === undefined) {
		return undefined;
	}
	return freezeClone(value);
}

export function createTranslationResourceV2Registry(
	definitions: ReadonlyArray<ResourceV2Definition> | undefined,
	groups: ReadonlyArray<ResourceV2GroupDefinition> | undefined,
): TranslationResourceV2Registry {
	const resourceMap = new Map<string, TranslationResourceV2Resource>();
	const parentMap = new Map<string, TranslationResourceV2Parent>();
	const groupToParent = new Map<string, string>();
	const resourcesList: TranslationResourceV2Resource[] = [];
	const parentsList: TranslationResourceV2Parent[] = [];

	const ensureParent = (
		descriptor: ResourceV2GroupParentDescriptor,
	): TranslationResourceV2Parent => {
		const existing = parentMap.get(descriptor.id);
		if (existing) {
			return existing;
		}
		const entry: TranslationResourceV2Parent = Object.freeze({
			id: descriptor.id,
			display: freezeClone(descriptor.display),
			bounds: freezeOptional(descriptor.bounds),
			tierTrack: freezeOptional(descriptor.tierTrack),
			trackValueBreakdown: descriptor.trackValueBreakdown ?? false,
			trackBoundBreakdown: descriptor.trackBoundBreakdown ?? false,
		});
		parentMap.set(entry.id, entry);
		parentsList.push(entry);
		return entry;
	};

	if (groups) {
		for (const group of groups) {
			const parent = ensureParent(group.parent);
			groupToParent.set(group.id, parent.id);
		}
	}

	if (definitions) {
		for (const definition of definitions) {
			const groupId = definition.group?.groupId;
			const parentId = groupId ? groupToParent.get(groupId) : undefined;
			const entry: TranslationResourceV2Resource = Object.freeze({
				id: definition.id,
				display: freezeClone(definition.display),
				bounds: freezeOptional(definition.bounds),
				tierTrack: freezeOptional(definition.tierTrack),
				globalActionCost: freezeOptional(definition.globalActionCost),
				groupId,
				parentId,
				trackValueBreakdown: definition.trackValueBreakdown ?? false,
				trackBoundBreakdown: definition.trackBoundBreakdown ?? false,
			});
			resourceMap.set(entry.id, entry);
			resourcesList.push(entry);
		}
	}

	const resourcesArray = Object.freeze(resourcesList.slice());
	const parentsArray = Object.freeze(parentsList.slice());

	return Object.freeze({
		listResources() {
			return resourcesArray;
		},
		listParents() {
			return parentsArray;
		},
		getResource(id: string) {
			return resourceMap.get(id);
		},
		getParent(id: string) {
			return parentMap.get(id);
		},
		getParentForResource(id: string) {
			const resource = resourceMap.get(id);
			if (!resource?.parentId) {
				return undefined;
			}
			return parentMap.get(resource.parentId);
		},
		hasResource(id: string) {
			return resourceMap.has(id);
		},
	}) as TranslationResourceV2Registry;
}
