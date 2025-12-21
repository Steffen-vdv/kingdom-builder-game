import type {
	Registry,
	ActionConfig as ActionDef,
} from '@kingdom-builder/protocol';

export interface ActionCostConfiguration {
	readonly resourceId: string;
	readonly amount: number | null;
}

/**
 * Determines the common action cost resource by finding the intersection
 * of baseCosts across all non-system actions.
 *
 * Note: This is a fallback mechanism. The primary cost model is defined
 * at the meta-category level.
 */
export function determineCommonActionCostResource(
	actions: Registry<ActionDef>,
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
	return { resourceId: '', amount: null };
}
