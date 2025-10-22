import { describe, expect, it } from 'vitest';

import { createResourceGroupRegistry, createResourceV2Registry, resourceV2Definition, resourceV2Group } from '../src/resourceV2';

describe('ResourceV2 registries', () => {
	it('creates group registries with ordered groups and parent metadata', () => {
		const treasuryGroup = resourceV2Group('treasury')
			.order(1)
			.parent('treasury-total', (parent) => parent.name('Treasury').order(1))
			.child('gold')
			.build();

		const populationGroup = resourceV2Group('population')
			.order(2)
			.parent('population-total', (parent) => parent.name('Population').order(2).icon('👥'))
			.children(['council', 'legion'])
			.build();

		const registry = createResourceGroupRegistry([populationGroup, treasuryGroup]);

		expect(registry.registry.get('treasury')).toEqual(treasuryGroup);
		expect(Array.from(registry.childrenByGroupId.get('population') ?? [])).toEqual(['council', 'legion']);
		expect(registry.parentByGroupId.get('population')).toEqual(populationGroup.parent);
		expect(registry.orderedGroups.map((group) => group.id)).toEqual(['treasury', 'population']);
	});

	it('creates resource registries with grouped lookups and icon candidates', () => {
		const groupRegistry = createResourceGroupRegistry([
			resourceV2Group('population')
				.order(2)
				.parent('population-total', (parent) => parent.name('Population').order(2))
				.children(['council', 'legion'])
				.build(),
		]);

		const gold = resourceV2Definition('gold').name('Gold').icon('🪙').order(0).build();
		const legion = resourceV2Definition('legion').name('Legion').order(3).group('population', 1).icon('🛡️').build();
		const council = resourceV2Definition('council').name('Council').order(4).group('population', 2).build();

		const registry = createResourceV2Registry([gold, legion, council], groupRegistry);

		expect(registry.registry.get('gold')).toEqual(gold);
		const groupedIds = Array.from(registry.groupedResources.get('population') ?? []).map((definition) => definition.id);
		expect(groupedIds).toEqual(['legion', 'council']);
		expect(registry.standaloneResources.map((def) => def.id)).toEqual(['gold']);
		const topLevel = registry.topLevelEntries.map((entry) => (entry.kind === 'group' ? `group:${entry.group.id}` : `resource:${entry.resource.id}`));
		expect(topLevel).toEqual(['resource:gold', 'group:population']);
		expect(registry.primaryIconCandidate).toBe('🪙');
	});

	it('falls back to group metadata when selecting primary icons', () => {
		const registry = createResourceV2Registry(
			[resourceV2Definition('citizen').name('Citizen').order(3).group('population', 1).build()],
			createResourceGroupRegistry([
				resourceV2Group('population')
					.order(1)
					.parent('population-total', (parent) => parent.name('Population').order(1).icon('👥'))
					.child('citizen')
					.build(),
			]),
		);

		expect(registry.primaryIconCandidate).toBe('👥');
	});
});
