import type { ResourceV2GroupMetadata } from '@kingdom-builder/protocol';
import { resourceGroup } from '../config/builders';

export const RESOURCE_V2_GROUPS = [
	resourceGroup()
		.id('defense')
		.name('Defense Resources')
		.icon('🛡️')
		.description('Tracks resilience-focused resources that reduce incoming damage.')
		.order(1)
		.children(['fortificationStrength', 'absorption'])
		.parent((builder) => builder.id('defense-total').name('Total Defense').order(1).description('Sum of all defensive resources for display and requirements.').trackValueBreakdown())
		.metadata({ category: 'defense' })
		.build(),
	resourceGroup()
		.id('military')
		.name('Military Readiness')
		.icon('⚔️')
		.description('Resources representing offensive readiness and wartime strain.')
		.order(2)
		.children(['armyStrength', 'growth', 'warWeariness'])
		.parent((builder) =>
			builder
				.id('military-total')
				.name('Total Military Readiness')
				.order(2)
				.description('Aggregates military readiness to drive requirements and UI summaries.')
				.trackValueBreakdown()
				.trackBoundBreakdown(),
		)
		.metadata({ category: 'military' })
		.build(),
	resourceGroup()
		.id('populationCapacity')
		.name('Population Capacity')
		.icon('👥')
		.description('Population ceilings and related capacity trackers.')
		.order(3)
		.children(['maxPopulation'])
		.parent((builder) =>
			builder.id('populationCapacity-total').name('Population Capacity Total').order(3).description('Aggregated population capacity for requirements and dashboards.').trackBoundBreakdown(),
		)
		.metadata({ category: 'population' })
		.build(),
] satisfies ReadonlyArray<ResourceV2GroupMetadata>;

export type ResourceV2GroupId = (typeof RESOURCE_V2_GROUPS)[number]['id'];
