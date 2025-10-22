import { describe, expect, it } from 'vitest';

import { resourceGroup, resourceV2 } from '../src/config/builders';
import { RESOURCE_GROUPS_V2, RESOURCE_V2, createResourceGroupRegistry, createResourceV2Registry } from '../src/resourceV2';

describe('createResourceV2Registry', () => {
	it('assembles definitions from builders and preserves order', () => {
		const registry = createResourceV2Registry([
			resourceV2().id('beta').name('Resource Beta').order(2),
			(builder) => builder.id('alpha').name('Resource Alpha').order(1),
			resourceV2().id('gamma').name('Resource Gamma').order(3),
		]);

		expect(Object.keys(registry)).toEqual(['alpha', 'beta', 'gamma']);
		expect(registry.alpha?.order).toBe(1);
		expect(registry.beta?.order).toBe(2);
		expect(Object.isFrozen(registry)).toBe(true);
		expect(Object.isFrozen(registry.alpha)).toBe(true);
	});
});

describe('createResourceGroupRegistry', () => {
	it('builds groups, preserves ordering, and respects child order', () => {
		const resources = createResourceV2Registry([
			resourceV2().id('group-one-parent').name('Group One Parent').order(0).limited(),
			resourceV2().id('group-one-child-b').name('Group One Child B').order(2).groupId('group-one'),
			(builder) => builder.id('group-one-child-a').name('Group One Child A').order(1).groupId('group-one'),
			resourceV2().id('group-two-child').name('Group Two Child').order(3).groupId('group-two'),
		]);

		const groups = createResourceGroupRegistry(
			[
				resourceGroup()
					.id('group-two')
					.name('Group Two')
					.order(2)
					.parent((parent) => parent.id('group-two-parent').name('Group Two Parent').order(0))
					.child('group-two-child'),
				resourceGroup()
					.id('group-one')
					.name('Group One')
					.order(1)
					.parent((parent) => parent.id('group-one-parent').name('Group One Parent').order(0))
					.child('group-one-child-b')
					.child('group-one-child-a'),
			],
			resources,
		);

		expect(Object.keys(groups)).toEqual(['group-one', 'group-two']);
		expect(groups['group-one'].children).toEqual(['group-one-child-b', 'group-one-child-a']);
		expect(Object.isFrozen(groups)).toBe(true);
		expect(Object.isFrozen(groups['group-one'])).toBe(true);
		expect(Object.isFrozen(groups['group-one'].children)).toBe(true);
	});

	it('throws when a group references a missing child resource', () => {
		const resources = createResourceV2Registry([]);

		expect(() =>
			createResourceGroupRegistry(
				[
					resourceGroup()
						.id('missing-child-group')
						.name('Missing Child Group')
						.order(1)
						.parent((parent) => parent.id('missing-parent').name('Missing Parent').order(0))
						.child('unknown-resource'),
				],
				resources,
			),
		).toThrowError('ResourceGroup "missing-child-group" references unknown resource "unknown-resource". Add the resource to the ResourceV2 registry first.');
	});

	it('throws when a resource does not opt into the declared group', () => {
		const resources = createResourceV2Registry([resourceV2().id('mismatch-child').name('Mismatch Child').order(1).groupId('other-group')]);

		expect(() =>
			createResourceGroupRegistry(
				[
					resourceGroup()
						.id('mismatch-group')
						.name('Mismatch Group')
						.order(1)
						.parent((parent) => parent.id('mismatch-parent').name('Mismatch Parent').order(0))
						.child('mismatch-child'),
				],
				resources,
			),
		).toThrowError('Resource "mismatch-child" must declare groupId("mismatch-group") before it can join ResourceGroup "mismatch-group".');
	});

	it('throws when a resource declares a group but is not registered as a child', () => {
		const resources = createResourceV2Registry([resourceV2().id('orphan-child').name('Orphan Child').order(1).groupId('orphan-group')]);

		expect(() => createResourceGroupRegistry([], resources)).toThrowError(
			'Resource "orphan-child" declares groupId("orphan-group") but is missing from the ResourceGroup registry. Add it to the matching group.',
		);
	});
});

describe('default registries', () => {
	it('expose empty readonly records for ResourceV2 and ResourceGroup definitions', () => {
		expect(RESOURCE_V2).toEqual({});
		expect(Object.isFrozen(RESOURCE_V2)).toBe(true);
		expect(RESOURCE_GROUPS_V2).toEqual({});
		expect(Object.isFrozen(RESOURCE_GROUPS_V2)).toBe(true);
	});
});
