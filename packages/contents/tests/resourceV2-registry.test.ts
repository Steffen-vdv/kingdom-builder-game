import { describe, expect, it } from 'vitest';

import { resourceGroup, resourceV2 } from '../src/config/builders';
import { RESOURCE_GROUPS_V2, RESOURCE_V2, createResourceGroupRegistry, createResourceV2Registry } from '../src/resourceV2';
import { RESOURCE_V2_DEFINITIONS } from '../src/resourceV2/definitions';
import { RESOURCE_V2_GROUPS } from '../src/resourceV2/groups';

describe('ResourceV2 registries', () => {
	it('assembles published registries as frozen, order-aware records', () => {
		expect(Object.isFrozen(RESOURCE_V2)).toBe(true);
		expect(Object.isFrozen(RESOURCE_GROUPS_V2)).toBe(true);

		Object.values(RESOURCE_V2).forEach((definition) => {
			expect(Object.isFrozen(definition)).toBe(true);
		});

		Object.values(RESOURCE_GROUPS_V2).forEach((group) => {
			expect(Object.isFrozen(group)).toBe(true);
		});

		const expectedResourceOrder = [...RESOURCE_V2_DEFINITIONS].sort((a, b) => a.order - b.order).map((definition) => definition.id);
		expect(Object.keys(RESOURCE_V2)).toEqual(expectedResourceOrder);

		const expectedGroupOrder = [...RESOURCE_V2_GROUPS].sort((a, b) => a.order - b.order).map((group) => group.id);
		expect(Object.keys(RESOURCE_GROUPS_V2)).toEqual(expectedGroupOrder);
	});

	it('preserves child ordering when building group registries', () => {
		expect(RESOURCE_GROUPS_V2.defense.children).toEqual(['fortificationStrength', 'absorption']);
	});

	it('enforces parent/child constraints', () => {
		const resources = createResourceV2Registry([resourceV2().id('alpha').name('Alpha').order(1).groupId('alpha-group').build()]);

		const mismatchedResource = createResourceV2Registry([resourceV2().id('beta').name('Beta').order(1).groupId('beta-group').build()]);

		const validGroups = createResourceGroupRegistry(
			[
				resourceGroup()
					.id('alpha-group')
					.name('Alpha Group')
					.order(1)
					.children(['alpha'])
					.parent((builder) => builder.id('alpha-parent').name('Alpha Parent').order(1))
					.build(),
			],
			resources,
		);

		expect(Object.keys(validGroups)).toEqual(['alpha-group']);

		expect(() =>
			createResourceGroupRegistry(
				[
					resourceGroup()
						.id('beta-group')
						.name('Beta Group')
						.order(1)
						.children(['beta'])
						.parent((builder) => builder.id('beta-parent').name('Beta Parent').order(1))
						.build(),
				],
				mismatchedResource,
			),
		).toThrowError(/groupId "beta-group"/i);

		const missingGroupResources = createResourceV2Registry([resourceV2().id('orphan').name('Orphan').order(1).groupId('missing-group').build()]);

		expect(() => createResourceGroupRegistry([], missingGroupResources)).toThrowError(/missing ResourceGroup/i);
	});
});
