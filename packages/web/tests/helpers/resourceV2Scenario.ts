import {
	createResourceV2Registries,
	resourceV2Definition,
	resourceV2GroupDefinition,
} from '@kingdom-builder/testing';
import type {
	SessionRecentResourceGain,
	SessionResourceCatalogV2,
} from '@kingdom-builder/protocol';
import type {
	SessionMetadataDescriptor,
	SessionResourceBoundsV2,
	SessionResourceDefinitionV2,
	SessionResourceGroupDefinitionV2,
} from '@kingdom-builder/protocol/session';

export interface ResourceV2TestScenario {
	readonly catalog: SessionResourceCatalogV2;
	readonly resourceDefinitions: readonly SessionResourceDefinitionV2[];
	readonly groupDefinition: SessionResourceGroupDefinitionV2;
	readonly resourceMetadata: Record<string, SessionMetadataDescriptor>;
	readonly resourceGroupMetadata: Record<string, SessionMetadataDescriptor>;
	readonly playerValues: Record<string, number>;
	readonly opponentValues: Record<string, number>;
	readonly playerBounds: Record<string, SessionResourceBoundsV2>;
	readonly recentGains: readonly SessionRecentResourceGain[];
}

function cloneBounds(
	bounds: Record<string, SessionResourceBoundsV2>,
): Record<string, SessionResourceBoundsV2> {
	return Object.fromEntries(
		Object.entries(bounds).map(([id, entry]) => [
			id,
			{
				lowerBound: entry.lowerBound ?? null,
				upperBound: entry.upperBound ?? null,
			},
		]),
	);
}

export function createResourceV2TestScenario(): ResourceV2TestScenario {
	const economyGroup = resourceV2GroupDefinition({
		parent: {
			label: 'Economic Overview',
			icon: '💼',
			description: 'Grouping for synthetic economic metrics.',
		},
	});
	const treasuryResource = resourceV2Definition({
		metadata: {
			label: 'Royal Treasury',
			icon: '🏦',
			description: 'Liquid reserves available to the realm.',
			group: { id: economyGroup.id, order: 0 },
		},
		bounds: { lowerBound: 0 },
	});
	const moraleResource = resourceV2Definition({
		metadata: {
			label: 'Civic Pride',
			icon: '🎉',
			description: 'Population morale expressed as a percentage.',
			displayAsPercent: true,
			group: { id: economyGroup.id, order: 1 },
		},
		bounds: { lowerBound: 0, upperBound: 1 },
	});
	const { resources, groups } = createResourceV2Registries({
		resources: [treasuryResource, moraleResource],
		groups: [economyGroup],
	});
	const catalog: SessionResourceCatalogV2 = Object.freeze({
		resources,
		groups,
	}) as SessionResourceCatalogV2;
	const resourceMetadata: Record<string, SessionMetadataDescriptor> = {
		[treasuryResource.id]: {
			label: 'Royal Treasury',
			icon: '🏦',
			description: 'Liquid reserves available to the realm.',
		},
		[moraleResource.id]: {
			label: 'Civic Pride',
			icon: '🎉',
			description: 'Population morale expressed as a percentage.',
			displayAsPercent: true,
			format: { percent: true },
		},
	};
	const resourceGroupMetadata: Record<string, SessionMetadataDescriptor> = {
		[economyGroup.id]: {
			label: 'Economic Overview',
			icon: '💼',
			description: 'Grouping for synthetic economic metrics.',
		},
	};
	const playerBounds: Record<string, SessionResourceBoundsV2> = {
		[treasuryResource.id]: { lowerBound: 0, upperBound: null },
		[moraleResource.id]: { lowerBound: 0, upperBound: 1 },
	};
	const scenario: ResourceV2TestScenario = {
		catalog,
		resourceDefinitions: [treasuryResource, moraleResource],
		groupDefinition: economyGroup,
		resourceMetadata,
		resourceGroupMetadata,
		playerValues: {
			[treasuryResource.id]: 18,
			[moraleResource.id]: 0.7,
		},
		opponentValues: {
			[treasuryResource.id]: 9,
			[moraleResource.id]: 0.4,
		},
		playerBounds,
		recentGains: Object.freeze<SessionRecentResourceGain[]>([
			{ key: treasuryResource.id, amount: 3 },
			{ key: moraleResource.id, amount: -0.05 },
		]),
	};
	return {
		...scenario,
		playerBounds: cloneBounds(scenario.playerBounds),
	};
}
