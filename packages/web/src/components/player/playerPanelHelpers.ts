import type {
	SessionResourceDefinition,
	SessionResourceSection,
} from '@kingdom-builder/protocol';

/** Result type for grouped resources - guaranteed to have both sections */
export interface ResourcesBySection {
	economy: SessionResourceDefinition[];
	combat: SessionResourceDefinition[];
}

/** Groups resources by section (economy/combat), excluding groups and bounds */
export function groupResourcesBySection(
	resources: readonly SessionResourceDefinition[],
): ResourcesBySection {
	const result: ResourcesBySection = {
		economy: [],
		combat: [],
	};

	for (const resource of resources) {
		// Skip resources that belong to a group (they're rendered via the group)
		if (resource.groupId) {
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
