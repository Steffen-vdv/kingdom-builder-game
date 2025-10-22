import { describe, expect, it } from 'vitest';

import {
	buildGlobalActionCostDeclarations,
	buildResourceV2GroupPresentationMetadata,
	computeGroupParentMetadata,
	createResourceV2GroupRegistry,
	createResourceV2Registry,
	deriveOrderedResourceV2Values,
	freezeOrderedValues,
	type ResourceV2GroupDefinition,
	type ResourceV2OrderedValueEntry,
} from '../registry';
import { resourceV2 } from '../builders';

function createGroup(definition: ResourceV2GroupDefinition) {
	const groups = createResourceV2GroupRegistry();
	groups.add(definition);
	return groups;
}

describe('ResourceV2 registry helpers', () => {
	it('guards against duplicate resource registrations', () => {
		const registry = createResourceV2Registry();
		const definition = resourceV2('absorption')
			.label('Absorption')
			.description('Pilot resource for the migration suite.')
			.order(5)
			.build();

		registry.add(definition);

		expect(() => registry.add(definition)).toThrowError(
			'duplicate registration',
		);
	});

	it('aggregates parent metadata and enforces limited-resource rules', () => {
		const groups = createGroup({
			id: 'elemental',
			parent: {
				id: 'elemental-total',
				icon: 'Σ',
				label: 'Elemental Total',
				description: 'Computed aggregate for elemental tracks.',
				order: 2,
				limited: true,
			},
		});

		const resources = createResourceV2Registry();
		const fire = resourceV2('fire')
			.label('Fire')
			.description('Fire elemental focus.')
			.order(6)
			.group('elemental', 1)
			.build();
		const water = resourceV2('water')
			.label('Water')
			.description('Water elemental focus.')
			.order(7)
			.group('elemental', 2)
			.build();

		resources.add(fire);
		resources.add(water);

		const parentMetadata = computeGroupParentMetadata(groups);
		expect(parentMetadata.get('elemental')?.id).toBe('elemental-total');

		const presentations = buildResourceV2GroupPresentationMetadata(
			resources,
			groups,
		);

		expect(Object.isFrozen(presentations)).toBe(true);
		expect(presentations).toHaveLength(1);
		expect(presentations[0]?.parent.id).toBe('elemental-total');
		expect(presentations[0]?.children.map((child) => child.id)).toEqual([
			'fire',
			'water',
		]);
		expect(Object.isFrozen(presentations[0]?.children ?? [])).toBe(true);

		const conflicting = createResourceV2Registry();
		conflicting.add(fire);
		conflicting.add(
			resourceV2('elemental-total')
				.label('Elemental Total (manual)')
				.description('Should not be registered directly.')
				.order(9)
				.build(),
		);

		expect(() =>
			buildResourceV2GroupPresentationMetadata(conflicting, groups),
		).toThrowError('cannot be defined directly');
	});

	it('produces deterministic ordering across standalone resources and groups', () => {
		const groups = createResourceV2GroupRegistry();
		groups.add({
			id: 'elemental',
			parent: {
				id: 'elemental-total',
				icon: 'Σ',
				label: 'Elemental Total',
				description: 'Elemental overview.',
				order: 2,
				limited: true,
			},
		});
		groups.add({
			id: 'celestial',
			parent: {
				id: 'celestial-total',
				icon: '✦',
				label: 'Celestial Total',
				description: 'Celestial overview.',
				order: 4,
				limited: true,
			},
		});

		const resources = createResourceV2Registry();
		resources.add(
			resourceV2('gold')
				.label('Gold')
				.description('Standalone economy track.')
				.order(1)
				.build(),
		);
		resources.add(
			resourceV2('fire')
				.label('Fire')
				.description('Fire elemental focus.')
				.order(6)
				.group('elemental', 1)
				.build(),
		);
		resources.add(
			resourceV2('water')
				.label('Water')
				.description('Water elemental focus.')
				.order(7)
				.group('elemental', 2)
				.build(),
		);
		resources.add(
			resourceV2('moonlight')
				.label('Moonlight')
				.description('Celestial starter track.')
				.order(8)
				.group('celestial', 1)
				.build(),
		);
		resources.add(
			resourceV2('starlight')
				.label('Starlight')
				.description('Celestial follow-up track.')
				.order(9)
				.group('celestial', 2)
				.build(),
		);

		const ordered: readonly ResourceV2OrderedValueEntry[] =
			deriveOrderedResourceV2Values(resources, groups);

		expect(Object.isFrozen(ordered)).toBe(true);
		expect(
			ordered.map((entry) =>
				entry.kind === 'group-parent'
					? `group:${entry.parent.id}`
					: `resource:${entry.definition.id}`,
			),
		).toEqual([
			'resource:gold',
			'group:elemental-total',
			'resource:fire',
			'resource:water',
			'group:celestial-total',
			'resource:moonlight',
			'resource:starlight',
		]);

		const orderedCosts = buildGlobalActionCostDeclarations(resources);
		expect(Object.isFrozen(orderedCosts)).toBe(true);
		expect(orderedCosts).toEqual([]);

		const frozenStandalone = freezeOrderedValues(
			resources.values().filter((definition) => !definition.group),
			(definition) => definition.display.order,
		);
		expect(Object.isFrozen(frozenStandalone)).toBe(true);
	});
});
