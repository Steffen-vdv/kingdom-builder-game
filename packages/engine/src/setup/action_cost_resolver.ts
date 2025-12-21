import type {
	ActionMetaCategoryConfig,
	Registry,
	ActionConfig as ActionDef,
} from '@kingdom-builder/protocol';

export interface ActionCostConfiguration {
	readonly resourceId: string;
	readonly amount: number | null;
}

/**
 * Determines the common action cost resource by finding the intersection
 * of baseCosts across all non-system actions. If no common baseCost is found,
 * falls back to the first 'global' cost model meta-category's binding resource.
 */
export function determineCommonActionCostResource(
	actions: Registry<ActionDef>,
	actionMetaCategories?: Registry<ActionMetaCategoryConfig>,
): ActionCostConfiguration {
	let intersection: string[] | null = null;
	for (const [, actionDefinition] of actions.entries()) {
		if (actionDefinition.system) {
			continue;
		}
		const costKeys = Object.keys(actionDefinition.baseCosts || {});
		if (!costKeys.length) {
			continue;
		}
		intersection = intersection
			? intersection.filter((key) => costKeys.includes(key))
			: costKeys;
	}
	if (intersection && intersection.length > 0) {
		const resourceId = intersection[0]!;
		return { resourceId, amount: null };
	}

	// Fallback: use the binding resource from first global cost meta-category
	if (actionMetaCategories) {
		for (const [, metaCategory] of actionMetaCategories.entries()) {
			if (metaCategory.costModel === 'global') {
				return {
					resourceId: metaCategory.bindingResourceId,
					amount: metaCategory.globalCostAmount ?? null,
				};
			}
		}
	}

	return { resourceId: '', amount: null };
}
