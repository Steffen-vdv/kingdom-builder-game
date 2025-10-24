import {
	createResourceV2Registries,
	resourceV2Definition,
	resourceV2GroupDefinition,
} from '@kingdom-builder/testing';
import { Resource, getResourceV2Id } from '@kingdom-builder/contents/resources';
import { Stat, getStatResourceV2Id } from '@kingdom-builder/contents/stats';
import { PopulationRole } from '@kingdom-builder/contents/populationRoles';
import type {
	SessionMetadataDescriptor,
	SessionResourceCatalogV2,
} from '@kingdom-builder/protocol/session';

interface ResourceV2TestCatalog {
	catalog: SessionResourceCatalogV2;
	metadata: Record<string, SessionMetadataDescriptor>;
	groupMetadata: Record<string, SessionMetadataDescriptor>;
}

function createMetadata(
	id: string,
	label: string,
	icon: string,
	description: string,
	displayAsPercent = false,
): SessionMetadataDescriptor {
	const descriptor: SessionMetadataDescriptor = {
		label,
		icon,
		description,
	};
	if (displayAsPercent) {
		descriptor.displayAsPercent = true;
	}
	return descriptor;
}

function titleCase(value: string): string {
	if (!value.length) {
		return value;
	}
	return value.charAt(0).toUpperCase() + value.slice(1);
}

export function createTestResourceCatalogV2(): ResourceV2TestCatalog {
	const economyGroupId = 'resource-group:test:economy';
	const statsGroupId = 'resource-group:test:stats';
	const populationGroupId = 'resource-group:test:population';

	const groups = [
		resourceV2GroupDefinition({
			id: economyGroupId,
			order: 0,
			parent: {
				label: 'Economic Portfolio',
				icon: '💰',
				description: 'Resources that fuel construction and upkeep.',
				lowerBound: 0,
			},
		}),
		resourceV2GroupDefinition({
			id: statsGroupId,
			order: 1,
			parent: {
				label: 'Realm Statistics',
				icon: '📊',
				description: 'Core statistics that shape realm performance.',
				lowerBound: 0,
			},
		}),
		resourceV2GroupDefinition({
			id: populationGroupId,
			order: 2,
			parent: {
				label: 'Population Roles',
				icon: '🧑‍🤝‍🧑',
				description: 'Specialist assignments for citizens.',
				lowerBound: 0,
			},
		}),
	];

	const resources = Object.values(Resource).map((key, index) => {
		const id = getResourceV2Id(key);
		return resourceV2Definition({
			id,
			metadata: {
				label: `${titleCase(key)} Reserve`,
				icon: `icon-resource-${key}`,
				description: `Session resource entry for ${key}.`,
				group: { id: economyGroupId, order: index },
			},
			bounds: { lowerBound: 0 },
		});
	});

	const percentStats = new Set([Stat.absorption, Stat.growth]);
	const stats = Object.values(Stat).map((key, index) => {
		const id = getStatResourceV2Id(key);
		return resourceV2Definition({
			id,
			metadata: {
				label: `${titleCase(key)} Stat`,
				icon: `icon-stat-${key}`,
				description: `Session stat entry for ${key}.`,
				group: { id: statsGroupId, order: index },
				displayAsPercent: percentStats.has(key),
			},
			bounds: { lowerBound: 0 },
		});
	});

	const populationRoles = Object.values(PopulationRole).map((key, index) =>
		resourceV2Definition({
			id: `resource:population:role:${key}`,
			metadata: {
				label: `${titleCase(key)} Role`,
				icon: `icon-population-${key}`,
				description: `Population assignment for ${key}.`,
				group: { id: populationGroupId, order: index },
			},
			bounds: { lowerBound: 0 },
		}),
	);

	const { resources: resourceRegistry, groups: groupRegistry } =
		createResourceV2Registries({
			resources: [...resources, ...stats, ...populationRoles],
			groups,
		});

	const metadata: Record<string, SessionMetadataDescriptor> = {};
	for (const definition of resourceRegistry.ordered) {
		metadata[definition.id] = createMetadata(
			definition.id,
			definition.label,
			definition.icon,
			definition.description ?? '',
			definition.displayAsPercent,
		);
	}

	const groupMetadata: Record<string, SessionMetadataDescriptor> = {};
	for (const definition of groupRegistry.ordered) {
		const parent = definition.parent;
		if (parent) {
			groupMetadata[definition.id] = createMetadata(
				definition.id,
				parent.label,
				parent.icon,
				parent.description ?? '',
				parent.displayAsPercent ?? false,
			);
		} else {
			groupMetadata[definition.id] = createMetadata(
				definition.id,
				definition.id,
				'icon-resource-group-generic',
				'Resource group entry.',
			);
		}
	}

	const catalog: SessionResourceCatalogV2 = {
		resources: resourceRegistry,
		groups: groupRegistry,
	};

	return { catalog, metadata, groupMetadata };
}
