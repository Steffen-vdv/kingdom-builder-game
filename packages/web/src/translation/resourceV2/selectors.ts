import type {
	ResourceV2BoundsMetadata,
	ResourceV2Definition,
	ResourceV2GroupDefinition,
	ResourceV2GroupParentDescriptor,
	ResourceV2TierTrackDefinition,
} from '@kingdom-builder/protocol';
import { clone } from '../../state/clone';
import type {
	TranslationResourceV2Display,
	TranslationResourceV2GlobalCostInfo,
	TranslationResourceV2Selectors,
} from '../context/types';

type ParentEntry = {
	readonly descriptor: ResourceV2GroupParentDescriptor;
	readonly group: ResourceV2GroupDefinition;
};

function freezeArray<TValue>(values: Iterable<TValue>): ReadonlyArray<TValue> {
	return Object.freeze(Array.from(values));
}

function cloneBounds(bounds: ResourceV2BoundsMetadata | undefined) {
	if (!bounds) {
		return undefined;
	}
	return Object.freeze({ ...bounds });
}

function cloneTierTrack(track: ResourceV2TierTrackDefinition | undefined) {
	if (!track) {
		return undefined;
	}
	return clone<ResourceV2TierTrackDefinition>(track);
}

const EMPTY_SELECTORS: TranslationResourceV2Selectors = Object.freeze({
	keys: Object.freeze([]),
	has() {
		return false;
	},
	selectDisplay() {
		return undefined;
	},
	selectPercentFormat() {
		return undefined;
	},
	selectBounds() {
		return undefined;
	},
	selectTierTrack() {
		return undefined;
	},
	selectGlobalCostInfo() {
		return undefined;
	},
});

export function createResourceV2Selectors(
	definitions: ReadonlyArray<ResourceV2Definition> | undefined,
	groups: ReadonlyArray<ResourceV2GroupDefinition> | undefined,
): TranslationResourceV2Selectors {
	const definitionEntries = definitions ?? [];
	const groupEntries = groups ?? [];
	if (definitionEntries.length === 0 && groupEntries.length === 0) {
		return EMPTY_SELECTORS;
	}
	const definitionMap = new Map<string, ResourceV2Definition>();
	for (const definition of definitionEntries) {
		definitionMap.set(definition.id, definition);
	}
	const parentDescriptorById = new Map<string, ParentEntry>();
	const parentByChild = new Map<string, ParentEntry>();
	for (const group of groupEntries) {
		const parent: ParentEntry = {
			descriptor: group.parent,
			group,
		};
		parentDescriptorById.set(group.parent.id, parent);
		for (const child of group.children) {
			parentByChild.set(child, parent);
		}
	}
	const keySet = new Set<string>();
	for (const id of definitionMap.keys()) {
		keySet.add(id);
	}
	for (const id of parentDescriptorById.keys()) {
		keySet.add(id);
	}
	const keys = freezeArray(keySet.values());

	const displayCache = new Map<
		string,
		TranslationResourceV2Display | undefined
	>();
	const boundsCache = new Map<string, ResourceV2BoundsMetadata | undefined>();
	const tierTrackCache = new Map<
		string,
		ResourceV2TierTrackDefinition | undefined
	>();
	const percentCache = new Map<string, boolean | undefined>();
	const globalCostCache = new Map<
		string,
		TranslationResourceV2GlobalCostInfo | undefined
	>();

	const resolveParent = (id: string): ParentEntry | undefined => {
		return parentDescriptorById.get(id) ?? parentByChild.get(id);
	};

	const resolveDisplay = (
		id: string,
	): TranslationResourceV2Display | undefined => {
		const cached = displayCache.get(id);
		if (cached !== undefined || displayCache.has(id)) {
			return cached;
		}
		const definition = definitionMap.get(id);
		const parent = resolveParent(id);
		const display = definition?.display;
		const parentDisplay = parent?.descriptor.display;
		if (!display && !parentDisplay) {
			displayCache.set(id, undefined);
			return undefined;
		}
		const entry: TranslationResourceV2Display = {
			label: display?.name ?? parentDisplay?.name ?? id,
		};
		const icon = display?.icon ?? parentDisplay?.icon;
		if (icon !== undefined) {
			entry.icon = icon;
		}
		const description = display?.description ?? parentDisplay?.description;
		if (description !== undefined) {
			entry.description = description;
		}
		const percentFlag =
			display?.displayAsPercent ?? parentDisplay?.displayAsPercent;
		if (percentFlag !== undefined) {
			entry.displayAsPercent = percentFlag;
		}
		const frozen = Object.freeze(entry);
		displayCache.set(id, frozen);
		return frozen;
	};

	const selectors: TranslationResourceV2Selectors = {
		keys,
		has(id: string) {
			return (
				definitionMap.has(id) ||
				parentDescriptorById.has(id) ||
				parentByChild.has(id)
			);
		},
		selectDisplay(id: string) {
			return resolveDisplay(id);
		},
		selectPercentFormat(id: string) {
			if (percentCache.has(id)) {
				return percentCache.get(id);
			}
			const display = resolveDisplay(id);
			const percent = display?.displayAsPercent;
			percentCache.set(id, percent);
			return percent;
		},
		selectBounds(id: string) {
			if (boundsCache.has(id)) {
				return boundsCache.get(id);
			}
			const definition = definitionMap.get(id);
			const parent = resolveParent(id);
			const bounds = cloneBounds(
				definition?.bounds ?? parent?.descriptor.bounds,
			);
			boundsCache.set(id, bounds);
			return bounds;
		},
		selectTierTrack(id: string) {
			if (tierTrackCache.has(id)) {
				return tierTrackCache.get(id);
			}
			const definition = definitionMap.get(id);
			const parent = resolveParent(id);
			const track = cloneTierTrack(
				definition?.tierTrack ?? parent?.descriptor.tierTrack,
			);
			tierTrackCache.set(id, track);
			return track;
		},
		selectGlobalCostInfo(id: string) {
			if (globalCostCache.has(id)) {
				return globalCostCache.get(id);
			}
			const definition = definitionMap.get(id);
			if (!definition?.globalActionCost) {
				globalCostCache.set(id, undefined);
				return undefined;
			}
			const cost = definition.globalActionCost;
			const display = resolveDisplay(id);
			const entry: TranslationResourceV2GlobalCostInfo = {
				amount: cost.amount,
				label: display?.label ?? id,
			};
			if (display?.icon !== undefined) {
				entry.icon = display.icon;
			}
			const info = Object.freeze(entry);
			globalCostCache.set(id, info);
			return info;
		},
	};

	return selectors;
}
