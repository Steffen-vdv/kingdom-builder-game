import { describe, expect, it } from 'vitest';
import {
	createResourceDisplayPlan,
	createValueDescriptor,
	extractGroupChildren,
	type SessionResourceValueDescriptorRecord,
} from '../src/session';
import type {
	ResourceV2DisplayMetadataConfig,
	ResourceV2GroupDefinitionConfig,
	ResourceV2GroupMetadataConfig,
} from '../src/resourceV2/definitions';

describe('session resourceV2 helpers', () => {
	const display = (
		order: number,
		label: string,
	): ResourceV2DisplayMetadataConfig => ({
		icon: label.toLowerCase(),
		label,
		description: `${label} descriptor`,
		order,
	});

	const groupParent: ResourceV2GroupDefinitionConfig['parent'] = {
		id: 'council-parent',
		icon: 'crown',
		label: 'Council',
		description: 'Council totals',
		order: 1,
		limited: true,
	};

	const groupMeta = (order: number): ResourceV2GroupMetadataConfig => ({
		groupId: 'council',
		order,
		parent: groupParent,
	});

	const definitions: Record<string, ResourceV2GroupDefinitionConfig> = {
		council: { id: 'council', parent: groupParent },
	};

	it('builds descriptors with group metadata', () => {
		const descriptor = createValueDescriptor(
			'focus',
			display(3, 'Focus'),
			groupMeta(2),
		);
		expect(descriptor.groupId).toBe('council');
		expect(descriptor.groupOrder).toBe(2);
		expect(descriptor.parentId).toBe('council-parent');
		expect(descriptor.limitedParent).toBe(true);
	});

	it('orders display plan entries by group and standalone order', () => {
		const descriptors: SessionResourceValueDescriptorRecord = {
			morale: createValueDescriptor(
				'morale',
				display(5, 'Morale'),
				groupMeta(1),
			),
			focus: createValueDescriptor('focus', display(6, 'Focus'), groupMeta(2)),
			glory: createValueDescriptor('glory', display(2, 'Glory')),
			zeal: createValueDescriptor('zeal', display(1, 'Zeal')),
		};

		const groups = extractGroupChildren(definitions, descriptors);
		const plan = createResourceDisplayPlan(descriptors, groups);

		expect(plan.groups).toHaveLength(1);
		expect(plan.groups[0]?.parent.id).toBe('council-parent');
		expect(plan.groups[0]?.values.map((entry) => entry.id)).toEqual([
			'morale',
			'focus',
		]);
		expect(plan.standalone.map((entry) => entry.id)).toEqual(['zeal', 'glory']);
	});

	it('extracts group children sorted by group order', () => {
		const descriptors: SessionResourceValueDescriptorRecord = {
			morale: createValueDescriptor(
				'morale',
				display(5, 'Morale'),
				groupMeta(3),
			),
			focus: createValueDescriptor('focus', display(6, 'Focus'), groupMeta(1)),
			valor: createValueDescriptor('valor', display(4, 'Valor'), groupMeta(2)),
		};

		const groups = extractGroupChildren(definitions, descriptors);
		expect(groups.council.children).toEqual(['focus', 'valor', 'morale']);
	});
});
