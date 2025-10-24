import type {
	RuntimeResourceBounds,
	RuntimeResourceCatalog,
	RuntimeResourceDefinition,
	RuntimeResourceGlobalCostConfig,
	RuntimeResourceGroup,
	RuntimeResourceGroupParent,
	RuntimeResourceGroupRegistry,
	RuntimeResourceMetadata,
	RuntimeResourceRegistry,
	RuntimeResourceTierDefinition,
	RuntimeResourceTierThreshold,
	RuntimeResourceTierTrack,
	RuntimeResourceTierTrackMetadata,
} from './types';

import type {
	ContentOrderedRegistry,
	ContentResourceDefinition,
	ContentResourceGroupDefinition,
	ContentResourceGroupParent,
	ContentTierDefinition,
	ContentTierTrack,
	ContentTierTrackMetadata,
	ContentTierThreshold,
} from './content-types';

const RUNTIME_PREFIX = 'ResourceV2 runtime';

type NumericField =
	| 'order'
	| 'groupOrder'
	| 'lowerBound'
	| 'upperBound'
	| 'globalCost.amount'
	| 'tier.metadata.order'
	| 'tier.order'
	| 'tier.threshold.min'
	| 'tier.threshold.max';

function assertInteger(
	value: number,
	field: NumericField,
	context: string,
): void {
	if (!Number.isInteger(value)) {
		throw new Error(
			`${RUNTIME_PREFIX} expected ${context} ${field} to be an integer but received ${value}.`,
		);
	}
}

function assertPositiveInteger(
	value: number,
	field: NumericField,
	context: string,
): void {
	assertInteger(value, field, context);
	if (value <= 0) {
		throw new Error(
			`${RUNTIME_PREFIX} expected ${context} ${field} to be greater than 0 but received ${value}.`,
		);
	}
}

function normalizeBounds(
	definition: ContentResourceDefinition | ContentResourceGroupParent,
): RuntimeResourceBounds {
	const { lowerBound, upperBound } = definition;
	const context = `"${definition.id}"`;
	if (typeof lowerBound === 'number') {
		assertInteger(lowerBound, 'lowerBound', context);
	}
	if (typeof upperBound === 'number') {
		assertInteger(upperBound, 'upperBound', context);
	}
	return {
		lowerBound: typeof lowerBound === 'number' ? lowerBound : null,
		upperBound: typeof upperBound === 'number' ? upperBound : null,
	};
}

function normalizeMetadata(
	definition: ContentResourceDefinition | ContentResourceGroupParent,
	fallbackOrder: number,
): RuntimeResourceMetadata {
	const context = `"${definition.id}"`;
	const { order, tags } = definition;
	if (typeof order === 'number') {
		assertInteger(order, 'order', context);
	}
	return {
		id: definition.id,
		label: definition.label,
		icon: definition.icon,
		description: definition.description ?? null,
		order: typeof order === 'number' ? order : null,
		resolvedOrder: typeof order === 'number' ? order : fallbackOrder,
		tags: Object.freeze([...(tags ?? [])]),
	};
}

function normalizeTierThreshold(
	threshold: ContentTierThreshold,
	context: string,
): RuntimeResourceTierThreshold {
	const { min, max } = threshold ?? {};
	if (typeof min === 'number') {
		assertInteger(min, 'tier.threshold.min', context);
	}
	if (typeof max === 'number') {
		assertInteger(max, 'tier.threshold.max', context);
	}
	return Object.freeze({
		min: typeof min === 'number' ? min : null,
		max: typeof max === 'number' ? max : null,
	});
}

function normalizeTierMetadata(
	metadata: ContentTierTrackMetadata,
	context: string,
	fallbackOrder: number,
): RuntimeResourceTierTrackMetadata {
	const { order } = metadata;
	if (typeof order === 'number') {
		assertInteger(order, 'tier.metadata.order', context);
	}
	return {
		id: metadata.id,
		label: metadata.label,
		order: typeof order === 'number' ? order : null,
		resolvedOrder: typeof order === 'number' ? order : fallbackOrder,
		...(metadata.icon !== undefined ? { icon: metadata.icon } : {}),
		...(metadata.description !== undefined
			? { description: metadata.description }
			: {}),
	};
}

function normalizeTierDefinition(
	definition: ContentTierDefinition,
	context: string,
	fallbackOrder: number,
): RuntimeResourceTierDefinition {
	const tierContext = `${context} tier "${definition.id}"`;
	const { order, enterEffects, exitEffects } = definition;
	if (typeof order === 'number') {
		assertInteger(order, 'tier.order', tierContext);
	}
	const runtime: RuntimeResourceTierDefinition = {
		id: definition.id,
		label: definition.label,
		order: typeof order === 'number' ? order : null,
		resolvedOrder: typeof order === 'number' ? order : fallbackOrder,
		threshold: normalizeTierThreshold(definition.threshold, tierContext),
		enterEffects: Object.freeze([...(enterEffects ?? [])]),
		exitEffects: Object.freeze([...(exitEffects ?? [])]),
		...(definition.icon !== undefined ? { icon: definition.icon } : {}),
		...(definition.description !== undefined
			? { description: definition.description }
			: {}),
	};
	return Object.freeze(runtime);
}

function normalizeTierTrack(
	track: ContentTierTrack | undefined,
	context: string,
): RuntimeResourceTierTrack | undefined {
	if (!track) {
		return undefined;
	}
	const metadata = normalizeTierMetadata(track.metadata, context, 0);
	const tiers = track.tiers.map((tier, index) =>
		normalizeTierDefinition(tier, context, index),
	);
	return Object.freeze({
		metadata: Object.freeze({ ...metadata }),
		tiers: Object.freeze([...tiers]),
	});
}

function assertClampOnlyReconciliation(
	definition: ContentResourceDefinition | ContentResourceGroupParent,
	context: string,
): void {
	const reconciliation = (definition as { reconciliation?: string })
		.reconciliation;
	if (reconciliation && reconciliation !== 'clamp') {
		throw new Error(
			`${RUNTIME_PREFIX} only supports clamp reconciliation during MVP. ${context} requested "${reconciliation}".`,
		);
	}
}

function normalizeGroupParent(
	parent: ContentResourceGroupParent,
	fallbackOrder: number,
): RuntimeResourceGroupParent {
	const context = `group parent "${parent.id}"`;
	assertClampOnlyReconciliation(parent, context);
	const metadata = normalizeMetadata(parent, fallbackOrder);
	const bounds = normalizeBounds(parent);
	const tierTrack = normalizeTierTrack(parent.tierTrack, context);
	return Object.freeze({
		...metadata,
		...bounds,
		displayAsPercent: parent.displayAsPercent ?? false,
		trackValueBreakdown: parent.trackValueBreakdown ?? false,
		trackBoundBreakdown: parent.trackBoundBreakdown ?? false,
		...(tierTrack ? { tierTrack } : {}),
	});
}

function normalizeGroup(
	definition: ContentResourceGroupDefinition,
	index: number,
): RuntimeResourceGroup {
	const { parent, order } = definition;
	if (typeof order === 'number') {
		assertInteger(order, 'order', `group "${definition.id}"`);
	}
	return Object.freeze({
		id: definition.id,
		order: typeof order === 'number' ? order : null,
		resolvedOrder: typeof order === 'number' ? order : index,
		...(parent ? { parent: normalizeGroupParent(parent, index) } : {}),
	});
}

function normalizeGlobalCost(
	definition: ContentResourceDefinition,
	context: string,
): RuntimeResourceGlobalCostConfig | undefined {
	const config = definition.globalCost;
	if (!config) {
		return undefined;
	}
	assertPositiveInteger(config.amount, 'globalCost.amount', context);
	return Object.freeze({ amount: config.amount });
}

export interface RuntimeResourceContent {
	readonly resources: ContentOrderedRegistry<ContentResourceDefinition>;
	readonly groups: ContentOrderedRegistry<ContentResourceGroupDefinition>;
}

export function createRuntimeResourceCatalog({
	resources,
	groups,
}: RuntimeResourceContent): RuntimeResourceCatalog {
	const runtimeGroups: RuntimeResourceGroup[] = [];
	const groupsById: Record<string, RuntimeResourceGroup> = {};
	for (const [index, group] of groups.ordered.entries()) {
		const runtimeGroup = normalizeGroup(group, index);
		if (groupsById[runtimeGroup.id]) {
			throw new Error(
				`${RUNTIME_PREFIX} received duplicate group id "${runtimeGroup.id}".`,
			);
		}
		groupsById[runtimeGroup.id] = runtimeGroup;
		runtimeGroups.push(runtimeGroup);
	}

	let globalCostResourceId: string | null = null;
	const runtimeResources: RuntimeResourceDefinition[] = [];
	const resourcesById: Record<string, RuntimeResourceDefinition> = {};
	const groupChildOrderFallback = new Map<string, number>();

	for (const [index, definition] of resources.ordered.entries()) {
		const context = `resource "${definition.id}"`;
		assertClampOnlyReconciliation(definition, context);

		const metadata = normalizeMetadata(definition, index);
		const bounds = normalizeBounds(definition);
		const groupId = definition.groupId ?? null;
		let groupOrderValue: number | null = null;
		let resolvedGroupOrder: number | null = null;
		if (groupId) {
			const group = groupsById[groupId];
			if (!group) {
				throw new Error(
					`${RUNTIME_PREFIX} resource "${definition.id}" references missing group "${groupId}".`,
				);
			}
			const fallback = groupChildOrderFallback.get(groupId) ?? 0;
			if (typeof definition.groupOrder === 'number') {
				assertInteger(definition.groupOrder, 'groupOrder', context);
				groupOrderValue = definition.groupOrder;
				resolvedGroupOrder = definition.groupOrder;
			} else {
				groupOrderValue = null;
				resolvedGroupOrder = fallback;
			}
			groupChildOrderFallback.set(groupId, fallback + 1);
		} else if (typeof definition.groupOrder === 'number') {
			throw new Error(
				`${RUNTIME_PREFIX} resource "${definition.id}" specifies groupOrder without groupId.`,
			);
		}

		if (resourcesById[definition.id]) {
			throw new Error(
				`${RUNTIME_PREFIX} received duplicate resource id "${definition.id}".`,
			);
		}

		const globalCost = normalizeGlobalCost(definition, context);
		if (globalCost) {
			if (globalCostResourceId && globalCostResourceId !== definition.id) {
				throw new Error(
					`${RUNTIME_PREFIX} only supports a single global cost resource during MVP (${globalCostResourceId} already configured, ${definition.id} attempted to join).`,
				);
			}
			globalCostResourceId = definition.id;
		}

		const tierTrack = normalizeTierTrack(definition.tierTrack, context);
		const runtimeDefinition: RuntimeResourceDefinition = Object.freeze({
			...metadata,
			...bounds,
			displayAsPercent: definition.displayAsPercent ?? false,
			trackValueBreakdown: definition.trackValueBreakdown ?? false,
			trackBoundBreakdown: definition.trackBoundBreakdown ?? false,
			groupId,
			groupOrder: groupOrderValue,
			resolvedGroupOrder,
			...(globalCost ? { globalCost } : {}),
			...(tierTrack ? { tierTrack } : {}),
		});

		runtimeResources.push(runtimeDefinition);
		resourcesById[runtimeDefinition.id] = runtimeDefinition;
	}

	const runtimeResourceRegistry: RuntimeResourceRegistry = {
		byId: Object.freeze({ ...resourcesById }),
		ordered: Object.freeze([...runtimeResources]),
	};
	const runtimeGroupRegistry: RuntimeResourceGroupRegistry = {
		byId: Object.freeze({ ...groupsById }),
		ordered: Object.freeze([...runtimeGroups]),
	};

	return Object.freeze({
		resources: runtimeResourceRegistry,
		groups: runtimeGroupRegistry,
	});
}
