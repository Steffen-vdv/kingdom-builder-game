import type {
	RuntimeBoundValue,
	RuntimeReconciliationMode,
	RuntimeResourceBounds,
	RuntimeResourceCatalog,
	RuntimeResourceCategoryDefinition,
	RuntimeResourceCategoryRegistry,
	RuntimeResourceDefinition,
	RuntimeResourceGroup,
	RuntimeResourceGroupParent,
	RuntimeResourceGroupRegistry,
	RuntimeResourceMetadata,
	RuntimeResourceRegistry,
} from './types';

import type {
	ContentBoundValue,
	ContentCategoryDefinition,
	ContentOrderedRegistry,
	ContentResourceDefinition,
	ContentResourceGroupDefinition,
	ContentResourceGroupParent,
} from './content-types';

import { normalizeCategory } from './fromContent-categories';
import { normalizeTierTrack } from './fromContent-tiers';

const RUNTIME_PREFIX = 'Resource runtime';

type NumericField = 'order' | 'groupOrder' | 'lowerBound' | 'upperBound';

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

/**
 * Normalizes a bound value from content to runtime format with reconciliation.
 * - Numbers are validated as integers and passed through.
 * - Reference objects have resourceId validated and reconciliation set.
 * - Undefined/null becomes null (unbounded).
 *
 * The reconciliation mode is now sourced from the bound-level configuration
 * (lowerBoundReconciliation/upperBoundReconciliation), not from inside the
 * reference. This allows reconciliation to be set for both static and dynamic
 * bounds.
 */
function normalizeBoundValueWithReconciliation(
	value: ContentBoundValue | undefined,
	field: 'lowerBound' | 'upperBound',
	context: string,
	reconciliation: RuntimeReconciliationMode,
): RuntimeBoundValue {
	if (value === undefined || value === null) {
		return null;
	}
	if (typeof value === 'number') {
		assertInteger(value, field, context);
		return value;
	}
	// It's a bound reference
	if (!value.resourceId) {
		throw new Error(
			`${RUNTIME_PREFIX} ${context} ${field} reference requires a non-empty resourceId.`,
		);
	}
	// Embed the reconciliation mode in the reference for the cascading system.
	// The cascading system (BoundDependentEntry) reads reconciliation from
	// RuntimeBoundReference when a bound resource changes.
	return Object.freeze({
		resourceId: value.resourceId,
		reconciliation,
	});
}

function normalizeBounds(
	definition: ContentResourceDefinition | ContentResourceGroupParent,
): RuntimeResourceBounds {
	const {
		lowerBound,
		upperBound,
		lowerBoundReconciliation,
		upperBoundReconciliation,
	} = definition;
	const context = `"${definition.id}"`;

	// For dynamic bounds, we need reconciliation embedded in the reference
	// for the cascading system. Use the explicit mode if specified, else 'clamp'.
	const lowerCascadeMode = lowerBoundReconciliation ?? 'clamp';
	const upperCascadeMode = upperBoundReconciliation ?? 'clamp';

	// Normalize bound values, passing the reconciliation for dynamic bounds
	const normalizedLower = normalizeBoundValueWithReconciliation(
		lowerBound,
		'lowerBound',
		context,
		lowerCascadeMode,
	);
	const normalizedUpper = normalizeBoundValueWithReconciliation(
		upperBound,
		'upperBound',
		context,
		upperCascadeMode,
	);

	// Only set bound-level reconciliation if explicitly specified in content.
	// When undefined, effect-level reconciliation takes precedence.
	const result: RuntimeResourceBounds = {
		lowerBound: normalizedLower,
		upperBound: normalizedUpper,
	};
	if (lowerBoundReconciliation !== undefined) {
		(
			result as { lowerBoundReconciliation?: RuntimeReconciliationMode }
		).lowerBoundReconciliation = lowerBoundReconciliation;
	}
	if (upperBoundReconciliation !== undefined) {
		(
			result as { upperBoundReconciliation?: RuntimeReconciliationMode }
		).upperBoundReconciliation = upperBoundReconciliation;
	}
	return result;
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

function normalizeGroupParent(
	parent: ContentResourceGroupParent,
	fallbackOrder: number,
): RuntimeResourceGroupParent {
	const context = `group parent "${parent.id}"`;
	const metadata = normalizeMetadata(parent, fallbackOrder);
	const bounds = normalizeBounds(parent);
	const tierTrack = normalizeTierTrack(parent.tierTrack, context);
	return Object.freeze({
		...metadata,
		...bounds,
		displayAsPercent: parent.displayAsPercent ?? false,
		allowDecimal: parent.allowDecimal ?? false,
		trackValueBreakdown: parent.trackValueBreakdown ?? false,
		trackBoundBreakdown: parent.trackBoundBreakdown ?? false,
		...(tierTrack ? { tierTrack } : {}),
	});
}

function normalizeGroup(
	definition: ContentResourceGroupDefinition,
	index: number,
): RuntimeResourceGroup {
	const { parent, order, label, icon } = definition;
	if (typeof order === 'number') {
		assertInteger(order, 'order', `group "${definition.id}"`);
	}
	return Object.freeze({
		id: definition.id,
		...(label ? { label } : {}),
		...(icon ? { icon } : {}),
		order: typeof order === 'number' ? order : null,
		resolvedOrder: typeof order === 'number' ? order : index,
		...(parent ? { parent: normalizeGroupParent(parent, index) } : {}),
	});
}

export interface RuntimeResourceContent {
	readonly resources: ContentOrderedRegistry<ContentResourceDefinition>;
	readonly groups: ContentOrderedRegistry<ContentResourceGroupDefinition>;
	readonly categories?: ContentOrderedRegistry<ContentCategoryDefinition>;
}

export function createRuntimeResourceCatalog({
	resources,
	groups,
	categories,
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

	const runtimeResources: RuntimeResourceDefinition[] = [];
	const resourcesById: Record<string, RuntimeResourceDefinition> = {};
	const groupChildOrderFallback = new Map<string, number>();

	for (const [index, definition] of resources.ordered.entries()) {
		const context = `resource "${definition.id}"`;

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

		const tierTrack = normalizeTierTrack(definition.tierTrack, context);
		const onValueIncrease = Object.freeze([
			...(definition.onValueIncrease ?? []),
		]);
		const onValueDecrease = Object.freeze([
			...(definition.onValueDecrease ?? []),
		]);
		const onPayUpkeepStep = Object.freeze([
			...(definition.onPayUpkeepStep ?? []),
		]);
		const onGainIncomeStep = Object.freeze([
			...(definition.onGainIncomeStep ?? []),
		]);
		const onGainAPStep = Object.freeze([...(definition.onGainAPStep ?? [])]);
		const upkeep = definition.upkeep
			? Object.freeze({ ...definition.upkeep })
			: undefined;
		const runtimeDefinition: RuntimeResourceDefinition = Object.freeze({
			...metadata,
			...bounds,
			displayAsPercent: definition.displayAsPercent ?? false,
			allowDecimal: definition.allowDecimal ?? false,
			trackValueBreakdown: definition.trackValueBreakdown ?? false,
			trackBoundBreakdown: definition.trackBoundBreakdown ?? false,
			groupId,
			groupOrder: groupOrderValue,
			resolvedGroupOrder,
			onValueIncrease,
			onValueDecrease,
			onPayUpkeepStep,
			onGainIncomeStep,
			onGainAPStep,
			section: definition.section ?? 'economy',
			secondary: definition.secondary ?? false,
			displayHint: definition.displayHint ?? null,
			...(tierTrack ? { tierTrack } : {}),
			...(upkeep ? { upkeep } : {}),
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

	const runtimeCategories: RuntimeResourceCategoryDefinition[] = [];
	const categoriesById: Record<string, RuntimeResourceCategoryDefinition> = {};
	if (categories) {
		for (const [index, category] of categories.ordered.entries()) {
			const runtimeCategory = normalizeCategory(category, index);
			if (categoriesById[runtimeCategory.id]) {
				throw new Error(
					`${RUNTIME_PREFIX} received duplicate category id "${runtimeCategory.id}".`,
				);
			}
			categoriesById[runtimeCategory.id] = runtimeCategory;
			runtimeCategories.push(runtimeCategory);
		}
	}
	const runtimeCategoryRegistry: RuntimeResourceCategoryRegistry = {
		byId: Object.freeze({ ...categoriesById }),
		ordered: Object.freeze([...runtimeCategories]),
	};

	return Object.freeze({
		resources: runtimeResourceRegistry,
		groups: runtimeGroupRegistry,
		categories: runtimeCategoryRegistry,
	});
}
