import type {
	SessionMetadataDescriptor,
	SessionResourceCatalogV2,
} from '@kingdom-builder/protocol/session';
import {
	createResourceV2Registries,
	resourceV2Definition,
	resourceV2GroupDefinition,
} from '@kingdom-builder/testing';
import { Resource, getResourceV2Id } from '@kingdom-builder/contents/resources';

const RESOURCE_GROUP_ID = 'resource-group:test:economy';
const GOLD_DESCRIPTION = 'Vaulted wealth supporting scaffolded sessions.';
const AP_DESCRIPTION = 'Momentum to fuel strategic commands.';
const HAPPINESS_DESCRIPTION = 'Tiered morale powering celebration effects.';
const CASTLE_HP_DESCRIPTION = 'Structural integrity of the royal stronghold.';
const ECONOMY_GROUP_DESCRIPTION =
	'Aggregated resource grouping for economy-centric data.';

interface ResourceCatalogFixture {
	catalog: SessionResourceCatalogV2;
	metadata: Record<string, SessionMetadataDescriptor>;
	groupMetadata: Record<string, SessionMetadataDescriptor>;
}

function cloneDefinitions<T extends { id: string }>(
	entries: ReadonlyArray<T>,
): T[] {
	return entries.map((entry) => structuredClone(entry));
}

function cloneRegistry<T extends { id: string }>(registry: {
	ordered: ReadonlyArray<T>;
	byId: Readonly<Record<string, T>>;
}): { ordered: T[]; byId: Record<string, T> } {
	const ordered = cloneDefinitions(registry.ordered);
	const byId = Object.fromEntries(
		Object.entries(registry.byId).map(([id, definition]) => [
			id,
			structuredClone(definition),
		]),
	) as Record<string, T>;
	return { ordered, byId };
}

export function createResourceV2CatalogFixture(): ResourceCatalogFixture {
	const goldId = getResourceV2Id(Resource.gold);
	const apId = getResourceV2Id(Resource.ap);
	const happinessId = getResourceV2Id(Resource.happiness);
	const castleHpId = getResourceV2Id(Resource.castleHP);
	const { resources, groups } = createResourceV2Registries({
		resources: [
			resourceV2Definition({
				id: goldId,
				metadata: {
					label: 'Gold Reserve',
					icon: '🥇',
					description: GOLD_DESCRIPTION,
					order: 0,
					group: {
						id: RESOURCE_GROUP_ID,
						order: 0,
					},
					tags: ['economy'],
				},
				bounds: { lowerBound: 0 },
			}),
			resourceV2Definition({
				id: apId,
				metadata: {
					label: 'Action Points',
					icon: '⚡',
					description: AP_DESCRIPTION,
					order: 1,
					group: {
						id: RESOURCE_GROUP_ID,
						order: 1,
					},
				},
				bounds: { lowerBound: 0 },
				globalCost: { amount: 1 },
			}),
			resourceV2Definition({
				id: happinessId,
				metadata: {
					label: 'Festival Morale',
					icon: '🎉',
					description: HAPPINESS_DESCRIPTION,
					order: 2,
					group: {
						id: RESOURCE_GROUP_ID,
						order: 2,
					},
				},
				bounds: {
					lowerBound: 0,
					upperBound: 10,
				},
			}),
			resourceV2Definition({
				id: castleHpId,
				metadata: {
					label: 'Castle Durability',
					icon: '🏰',
					description: CASTLE_HP_DESCRIPTION,
					order: 3,
					group: {
						id: RESOURCE_GROUP_ID,
						order: 3,
					},
				},
				bounds: {
					lowerBound: 0,
					upperBound: 12,
				},
			}),
		],
		groups: [
			resourceV2GroupDefinition({
				id: RESOURCE_GROUP_ID,
				order: 0,
				parent: {
					label: 'Economic Outlook',
					icon: '💹',
					description: ECONOMY_GROUP_DESCRIPTION,
				},
			}),
		],
	});
	const catalog: SessionResourceCatalogV2 = {
		resources: cloneRegistry(resources),
		groups: cloneRegistry(groups),
	};
	const resourceMetadata: Record<string, SessionMetadataDescriptor> = {};
	for (const definition of catalog.resources.ordered) {
		resourceMetadata[definition.id] = {
			label: definition.label,
			icon: definition.icon,
			description: definition.description ?? undefined,
			...(definition.displayAsPercent ? { displayAsPercent: true } : {}),
		} satisfies SessionMetadataDescriptor;
	}
	const resourceGroupMetadata: Record<string, SessionMetadataDescriptor> = {};
	for (const definition of catalog.groups.ordered) {
		const parent = definition.parent;
		resourceGroupMetadata[definition.id] = {
			label: parent?.label ?? definition.id,
			icon: parent?.icon,
			description: parent?.description ?? undefined,
			...(parent?.displayAsPercent ? { displayAsPercent: true } : {}),
		} satisfies SessionMetadataDescriptor;
	}
	return {
		catalog,
		metadata: resourceMetadata,
		groupMetadata: resourceGroupMetadata,
	};
}
