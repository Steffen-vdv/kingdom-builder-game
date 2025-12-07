import type {
	SessionResourceBoundReferenceV2,
	SessionResourceDefinitionV2,
	SessionResourceGroupDefinitionV2,
} from '@kingdom-builder/protocol';

/**
 * Entry describing a bound reference and its type.
 */
export type BoundRefEntry = {
	boundRef: SessionResourceBoundReferenceV2;
	boundType: 'lower' | 'upper';
};

/**
 * Check if a bound value is a reference to another resource.
 * Returns the reference if it is, or null if it's a number or null.
 */
export function getBoundReference(
	bound: number | SessionResourceBoundReferenceV2 | null | undefined,
): SessionResourceBoundReferenceV2 | null {
	if (bound != null && typeof bound === 'object' && 'resourceId' in bound) {
		return bound;
	}
	return null;
}

/** Add bound reference entry to map if it has a dynamic reference */
function addBoundEntry(
	map: Map<string, BoundRefEntry>,
	id: string,
	upperBound: number | SessionResourceBoundReferenceV2 | null | undefined,
	lowerBound: number | SessionResourceBoundReferenceV2 | null | undefined,
): void {
	// Check upper bound first (more common case)
	const upperRef = getBoundReference(upperBound);
	if (upperRef) {
		map.set(id, { boundRef: upperRef, boundType: 'upper' });
		return;
	}
	// Check lower bound
	const lowerRef = getBoundReference(lowerBound);
	if (lowerRef) {
		map.set(id, { boundRef: lowerRef, boundType: 'lower' });
	}
}

/**
 * Build a map from resource ID to bound reference info.
 * Includes both regular resources and group parents with dynamic bounds.
 */
export function buildBoundReferenceMap(
	definitions: readonly SessionResourceDefinitionV2[],
	groups?: readonly SessionResourceGroupDefinitionV2[],
): Map<string, BoundRefEntry> {
	const map = new Map<string, BoundRefEntry>();
	for (const definition of definitions) {
		addBoundEntry(
			map,
			definition.id,
			definition.upperBound,
			definition.lowerBound,
		);
	}
	// Also include group parent bounds (e.g., Population bounded by Max Pop)
	if (groups) {
		for (const group of groups) {
			if (group.parent) {
				addBoundEntry(
					map,
					group.parent.id,
					group.parent.upperBound,
					group.parent.lowerBound,
				);
			}
		}
	}
	return map;
}
