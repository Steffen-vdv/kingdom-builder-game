import type {
	SessionResourceBoundValue,
	SessionResourceDefinition,
	SessionResourceGroupDefinition,
	SessionResourceSection,
} from '@kingdom-builder/protocol';

/** Result type for grouped resources - guaranteed to have both sections */
export interface ResourcesBySection {
	economy: SessionResourceDefinition[];
	combat: SessionResourceDefinition[];
}

/**
 * Extract resource ID from a bound value if it's a reference.
 * Returns null for static numeric bounds.
 */
function getBoundResourceId(
	bound: SessionResourceBoundValue | null,
): string | null {
	if (bound === null || typeof bound === 'number') {
		return null;
	}
	return bound.resourceId;
}

/**
 * Collect all resource IDs that are referenced as bounds.
 * These resources should not be displayed standalone - they're shown
 * as part of the "current/max" display of the resource they bound.
 */
export function collectBoundReferencedIds(
	resources: readonly SessionResourceDefinition[],
	groups: readonly SessionResourceGroupDefinition[],
): Set<string> {
	const boundIds = new Set<string>();

	// Check resources for bound references
	for (const resource of resources) {
		const lowerId = getBoundResourceId(resource.lowerBound);
		const upperId = getBoundResourceId(resource.upperBound);
		if (lowerId) {
			boundIds.add(lowerId);
		}
		if (upperId) {
			boundIds.add(upperId);
		}
	}

	// Check group parents for bound references
	for (const group of groups) {
		if (group.parent) {
			const lowerId = getBoundResourceId(group.parent.lowerBound);
			const upperId = getBoundResourceId(group.parent.upperBound);
			if (lowerId) {
				boundIds.add(lowerId);
			}
			if (upperId) {
				boundIds.add(upperId);
			}
		}
	}

	return boundIds;
}

/** Groups resources by section (economy/combat), excluding groups and bounds */
export function groupResourcesBySection(
	resources: readonly SessionResourceDefinition[],
	groups: readonly SessionResourceGroupDefinition[],
): ResourcesBySection {
	// Collect IDs of resources that are referenced as bounds
	const boundReferencedIds = collectBoundReferencedIds(resources, groups);

	const result: ResourcesBySection = {
		economy: [],
		combat: [],
	};

	for (const resource of resources) {
		// Skip resources that belong to a group (they're rendered via the group)
		if (resource.groupId) {
			continue;
		}
		// Skip resources referenced as bounds (shown as "X/Y" with bounded resource)
		if (boundReferencedIds.has(resource.id)) {
			continue;
		}
		// section is guaranteed to be 'economy' | 'combat' by the protocol
		const sectionArray = result[resource.section];
		sectionArray.push(resource);
	}

	return result;
}

/** Find the resource group IDs for a given section */
export function getGroupsForSection(
	resources: readonly SessionResourceDefinition[],
	section: SessionResourceSection,
): string[] {
	const groupIds = new Set<string>();
	for (const resource of resources) {
		if (resource.groupId && resource.section === section) {
			groupIds.add(resource.groupId);
		}
	}
	return [...groupIds];
}
