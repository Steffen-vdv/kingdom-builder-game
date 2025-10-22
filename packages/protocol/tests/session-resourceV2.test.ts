import { describe, expect, it } from 'vitest';
import {
	buildSessionResourceGroupPresentations,
	deriveOrderedSessionResourceValues,
	freezeResourceMetadataByOrder,
	type SessionResourceGroupDescriptor,
	type SessionResourceValueDescriptor,
} from '../src/session';

describe('session resource value helpers', () => {
	it('stably sorts entries by order and index', () => {
		const ordered = freezeResourceMetadataByOrder(
			[
				{ id: 'a', order: 2 },
				{ id: 'b', order: 1 },
				{ id: 'c', order: 2 },
			],
			(entry) => entry.order,
		);
		expect(ordered.map((entry) => entry.id)).toEqual(['b', 'a', 'c']);
	});

	it('builds ordered group presentations and entries', () => {
		const descriptors: Record<string, SessionResourceValueDescriptor> = {
			alpha: { label: 'Alpha', order: 10 },
			beta: { label: 'Beta', order: 5 },
			gamma: { label: 'Gamma', order: 7 },
			delta: { label: 'Delta', order: 1 },
		};
		const groups: SessionResourceGroupDescriptor[] = [
			{
				groupId: 'focus',
				parent: { id: 'focus-parent', label: 'Focus', order: 3 },
				children: ['beta', 'gamma'],
			},
		];

		const presentations = buildSessionResourceGroupPresentations(
			descriptors,
			groups,
		);
		expect(presentations).toHaveLength(1);
		expect(presentations[0]?.parent.id).toBe('focus-parent');
		expect(presentations[0]?.children.map((child) => child.id)).toEqual([
			'beta',
			'gamma',
		]);

		const orderedEntries = deriveOrderedSessionResourceValues(
			descriptors,
			groups,
		);
		expect(orderedEntries[0]?.kind).toBe('value');
		expect(orderedEntries[0]?.descriptor.id).toBe('delta');
		const parentEntry = orderedEntries.find(
			(entry) => entry.kind === 'group-parent',
		);
		expect(parentEntry).toBeDefined();
		if (!parentEntry || parentEntry.kind !== 'group-parent') {
			throw new Error('expected group parent entry');
		}
		expect(parentEntry.parent.order).toBe(3);
		const childIds = orderedEntries
			.filter((entry) => entry.kind === 'value' && entry.groupId === 'focus')
			.map((entry) => entry.descriptor.id);
		expect(childIds).toEqual(['beta', 'gamma']);
		const standaloneIds = orderedEntries
			.filter((entry) => entry.kind === 'value' && !entry.groupId)
			.map((entry) => entry.descriptor.id);
		expect(standaloneIds).toEqual(['delta', 'alpha']);
	});
});
