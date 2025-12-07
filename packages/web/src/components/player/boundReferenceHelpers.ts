import type {
	SessionResourceBoundReferenceV2,
	SessionResourceDefinitionV2,
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

/**
 * Build a map from resource ID to bound reference info.
 * Only includes resources with dynamic bound references (not static).
 */
export function buildBoundReferenceMap(
	definitions: readonly SessionResourceDefinitionV2[],
): Map<string, BoundRefEntry> {
	const map = new Map<string, BoundRefEntry>();
	for (const definition of definitions) {
		// Check upper bound first (more common case)
		const upperRef = getBoundReference(definition.upperBound);
		if (upperRef) {
			map.set(definition.id, { boundRef: upperRef, boundType: 'upper' });
			continue;
		}
		// Check lower bound
		const lowerRef = getBoundReference(definition.lowerBound);
		if (lowerRef) {
			map.set(definition.id, { boundRef: lowerRef, boundType: 'lower' });
		}
	}
	return map;
}
