import type {
	ResourceV2BoundsMetadata,
	ResourceV2Definition,
	ResourceV2DisplayMetadata,
	ResourceV2GlobalActionCostMetadata,
	ResourceV2GroupDefinition,
	ResourceV2TierTrackDefinition,
} from '@kingdom-builder/protocol';

export interface ResourceV2MetadataEntry {
	readonly id: string;
	readonly display?: ResourceV2DisplayMetadata;
	readonly bounds?: ResourceV2BoundsMetadata;
	readonly tierTrack?: ResourceV2TierTrackDefinition;
	readonly globalActionCost?: ResourceV2GlobalActionCostMetadata;
}

export interface ResourceV2GlobalActionCostDisplay {
	readonly resourceId: string;
	readonly amount: number;
	readonly label: string;
	readonly icon?: string;
	readonly description?: string;
}

export interface ResourceV2MetadataSelectors {
	readonly nodes: ReadonlyMap<string, ResourceV2MetadataEntry>;
	displaysAsPercent(id: string): boolean;
	selectBounds(id: string): ResourceV2BoundsMetadata | undefined;
	selectTierTrack(id: string): ResourceV2TierTrackDefinition | undefined;
	selectGlobalActionCost(): ResourceV2GlobalActionCostDisplay | undefined;
}

interface MutableResourceV2MetadataEntry {
	id: string;
	display?: ResourceV2DisplayMetadata | undefined;
	bounds?: ResourceV2BoundsMetadata | undefined;
	tierTrack?: ResourceV2TierTrackDefinition | undefined;
	globalActionCost?: ResourceV2GlobalActionCostMetadata | undefined;
}

interface MutableResourceV2GlobalActionCostDisplay {
	resourceId: string;
	amount: number;
	label: string;
	icon?: string;
	description?: string;
}

function cloneDisplay(
	display: ResourceV2DisplayMetadata | undefined,
): ResourceV2DisplayMetadata | undefined {
	if (!display) {
		return undefined;
	}
	const clone = structuredClone(display);
	return Object.freeze(clone);
}

function cloneBounds(
	bounds: ResourceV2BoundsMetadata | undefined,
): ResourceV2BoundsMetadata | undefined {
	if (!bounds) {
		return undefined;
	}
	const clone = structuredClone(bounds);
	return Object.freeze(clone);
}

function cloneTierTrack(
	tierTrack: ResourceV2TierTrackDefinition | undefined,
): ResourceV2TierTrackDefinition | undefined {
	if (!tierTrack) {
		return undefined;
	}
	const clone = structuredClone(tierTrack);
	return Object.freeze(clone);
}

function cloneGlobalActionCost(
	metadata: ResourceV2GlobalActionCostMetadata | undefined,
): ResourceV2GlobalActionCostMetadata | undefined {
	if (!metadata) {
		return undefined;
	}
	const clone = structuredClone(metadata);
	return Object.freeze(clone);
}

function ensureEntry(
	entries: Map<string, MutableResourceV2MetadataEntry>,
	id: string,
): MutableResourceV2MetadataEntry {
	let entry = entries.get(id);
	if (!entry) {
		entry = { id };
		entries.set(id, entry);
	}
	return entry;
}

export function createResourceV2Selectors(
	definitions?: Iterable<ResourceV2Definition>,
	groups?: Iterable<ResourceV2GroupDefinition>,
): ResourceV2MetadataSelectors {
	const mutableEntries = new Map<string, MutableResourceV2MetadataEntry>();
	let globalActionCost: ResourceV2GlobalActionCostDisplay | undefined;

	if (definitions) {
		for (const definition of definitions) {
			const entry = ensureEntry(mutableEntries, definition.id);
			entry.display = cloneDisplay(definition.display) ?? entry.display;
			entry.bounds = cloneBounds(definition.bounds) ?? entry.bounds;
			entry.tierTrack = cloneTierTrack(definition.tierTrack) ?? entry.tierTrack;
			const clonedCost = cloneGlobalActionCost(definition.globalActionCost);
			if (!clonedCost) {
				continue;
			}
			entry.globalActionCost = clonedCost;
			if (globalActionCost) {
				continue;
			}
			const display = entry.display;
			const label = display?.name ?? definition.id;
			const icon = display?.icon;
			const description = display?.description;
			const costDisplay: MutableResourceV2GlobalActionCostDisplay = {
				resourceId: definition.id,
				amount: clonedCost.amount,
				label,
			};
			if (icon) {
				costDisplay.icon = icon;
			}
			if (description) {
				costDisplay.description = description;
			}
			globalActionCost = Object.freeze(
				costDisplay,
			) as ResourceV2GlobalActionCostDisplay;
		}
	}

	if (groups) {
		for (const group of groups) {
			const parent = group.parent;
			const entry = ensureEntry(mutableEntries, parent.id);
			entry.display = cloneDisplay(parent.display) ?? entry.display;
			entry.bounds = cloneBounds(parent.bounds) ?? entry.bounds;
			entry.tierTrack = cloneTierTrack(parent.tierTrack) ?? entry.tierTrack;
		}
	}

	const frozenEntries = new Map<string, ResourceV2MetadataEntry>();
	for (const [id, entry] of mutableEntries.entries()) {
		const payload: MutableResourceV2MetadataEntry = { id };
		const displayMetadata = entry.display;
		if (displayMetadata !== undefined) {
			payload.display = displayMetadata;
		}
		const boundsMetadata = entry.bounds;
		if (boundsMetadata !== undefined) {
			payload.bounds = boundsMetadata;
		}
		const tierTrackDefinition = entry.tierTrack;
		if (tierTrackDefinition !== undefined) {
			payload.tierTrack = tierTrackDefinition;
		}
		const globalCostMetadata = entry.globalActionCost;
		if (globalCostMetadata !== undefined) {
			payload.globalActionCost = globalCostMetadata;
		}
		frozenEntries.set(id, Object.freeze(payload) as ResourceV2MetadataEntry);
	}

	const nodes: ReadonlyMap<string, ResourceV2MetadataEntry> = frozenEntries;
	return Object.freeze({
		nodes,
		displaysAsPercent(id: string): boolean {
			const display = nodes.get(id)?.display;
			return display?.displayAsPercent === true;
		},
		selectBounds(id: string): ResourceV2BoundsMetadata | undefined {
			return nodes.get(id)?.bounds;
		},
		selectTierTrack(id: string): ResourceV2TierTrackDefinition | undefined {
			return nodes.get(id)?.tierTrack;
		},
		selectGlobalActionCost(): ResourceV2GlobalActionCostDisplay | undefined {
			return globalActionCost;
		},
	});
}
