/**
 * Technical helpers for action definitions.
 * These functions are infrastructure - they handle lookups, validations,
 * and parameter construction that content authors shouldn't need to touch.
 */
import type { Registry } from '@kingdom-builder/protocol';
import type { ResourceKey } from '../../internal';
import { getResourceId } from '../../internal';
import { resourceChange, type ResourceChangeEffectParams } from '../../resource';
import type { ActionCategoryConfig } from '../builders';

/**
 * Gets the order value for an action category.
 * Throws if the category doesn't exist.
 */
export function getCategoryOrder(categories: Registry<ActionCategoryConfig>, categoryId: string): number {
	const category = categories.get(categoryId);
	if (!category) {
		throw new Error(`Missing action category definition for id "${categoryId}".`);
	}
	return category.order ?? 0;
}

/**
 * Creates a list of resource change effect params from a resource amount map.
 * Filters out zero and non-finite amounts.
 */
export function createResourceChangeList(entries: Iterable<[ResourceKey, number]>): ResourceChangeEffectParams[] | undefined {
	const changes: ResourceChangeEffectParams[] = [];
	for (const [resource, amount] of entries) {
		if (!Number.isFinite(amount) || amount === 0) {
			continue;
		}
		const resourceId = getResourceId(resource);
		const change = resourceChange(resourceId).amount(amount).build();
		changes.push(change);
	}
	return changes.length > 0 ? changes : undefined;
}

/**
 * Converts a resource amount map to a list of resource change effect params.
 */
export function mapToResourceChangeList(map: Partial<Record<ResourceKey, number>> | undefined): ResourceChangeEffectParams[] | undefined {
	if (!map) {
		return undefined;
	}
	return createResourceChangeList(Object.entries(map) as [ResourceKey, number][]);
}

/**
 * Creates resource changes from a list of {resource, amount} objects.
 */
export function costsToResourceChangeList(costs: ReadonlyArray<{ resource: ResourceKey; amount: number }>): ResourceChangeEffectParams[] | undefined {
	return createResourceChangeList(costs.map(({ resource, amount }) => [resource, amount] as [ResourceKey, number]));
}
