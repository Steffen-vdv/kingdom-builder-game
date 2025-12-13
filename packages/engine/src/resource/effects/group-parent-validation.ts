/**
 * Group parent bound validation for resource effects.
 *
 * Group parents are virtual resources whose value is the sum of their children.
 * We must reject any child change that would violate the parent's bounds to
 * maintain computed value integrity.
 */
import type { PlayerState } from '../../state';
import type { RuntimeResourceCatalog } from '../types';
import { getCatalogIndexes, resolveBoundValue } from '../state-helpers';
import { ResourceBoundExceededError } from '../reconciliation';

/**
 * Validates that a resource change won't cause the group parent's computed
 * value to exceed its bounds.
 *
 * @throws ResourceBoundExceededError if the resulting parent value would
 *         violate its bounds
 */
export function validateGroupParentBounds(
	player: PlayerState,
	catalog: RuntimeResourceCatalog,
	resourceId: string,
	newChildValue: number,
): void {
	const indexes = getCatalogIndexes(catalog);
	const resource = indexes.resourceById[resourceId];
	if (!resource?.groupId) {
		return; // Resource not in a group
	}
	const group = catalog.groups.byId[resource.groupId];
	if (!group?.parent) {
		return; // Group has no parent virtual resource
	}
	// Calculate what the parent aggregate would be with the new child value
	const childIds = indexes.groupChildren[resource.groupId] ?? [];
	let newAggregate = 0;
	for (const childId of childIds) {
		if (childId === resourceId) {
			newAggregate += newChildValue;
		} else {
			newAggregate += player.resourceValues[childId] ?? 0;
		}
	}
	// Resolve parent bounds
	const parentLower = resolveBoundValue(
		group.parent.lowerBound,
		player.resourceValues,
	);
	const parentUpper = resolveBoundValue(
		group.parent.upperBound,
		player.resourceValues,
	);
	// Check lower bound violation
	if (parentLower !== null && newAggregate < parentLower) {
		throw new ResourceBoundExceededError(
			'lower',
			newAggregate,
			parentLower,
			parentLower - newAggregate,
		);
	}
	// Check upper bound violation
	if (parentUpper !== null && newAggregate > parentUpper) {
		throw new ResourceBoundExceededError(
			'upper',
			newAggregate,
			parentUpper,
			newAggregate - parentUpper,
		);
	}
}
