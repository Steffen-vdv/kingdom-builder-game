import type {
	ActionMetaCategoryConfig,
	Registry,
} from '@kingdom-builder/protocol';

export interface ActionCostConfiguration {
	readonly resourceId: string;
	readonly amount: number | null;
}

/**
 * Determines the common action cost resource from meta-category definitions.
 * Prioritizes 'global' cost model meta-categories (fixed cost per action),
 * then falls back to 'per-item' meta-categories (variable cost per action).
 */
export function determineCommonActionCostResource(
	actionMetaCategories?: Registry<ActionMetaCategoryConfig>,
): ActionCostConfiguration {
	if (!actionMetaCategories) {
		return { resourceId: '', amount: null };
	}

	// Prefer global cost model meta-categories (fixed cost per action)
	for (const [, metaCategory] of actionMetaCategories.entries()) {
		if (metaCategory.costModel === 'global') {
			return {
				resourceId: metaCategory.bindingResourceId,
				amount: metaCategory.globalCostAmount ?? null,
			};
		}
	}

	// Fall back to per-item meta-categories (variable cost per action)
	for (const [, metaCategory] of actionMetaCategories.entries()) {
		return {
			resourceId: metaCategory.bindingResourceId,
			amount: null,
		};
	}

	return { resourceId: '', amount: null };
}
