import { describe, expect, it } from 'vitest';
import { diffPlayerSnapshots } from '../../src/effects/attack/snapshot_diff';
import type { PlayerSnapshot } from '../../src/log';

describe('attack snapshot diff', () => {
	it('uses ordered value metadata when generating diffs', () => {
		const before: PlayerSnapshot = {
			values: {
				parent: {
					kind: 'group-parent',
					value: 5,
					children: ['child-a', 'child-b'],
				},
				'child-a': { kind: 'resource', value: 3, parentId: 'parent' },
				'child-b': { kind: 'resource', value: 2, parentId: 'parent' },
			},
			orderedValueIds: ['parent', 'child-a', 'child-b'],
			resources: {},
			stats: {},
			buildings: [],
			lands: [],
			passives: [],
		};
		const after: PlayerSnapshot = {
			values: {
				parent: {
					kind: 'group-parent',
					value: 7,
					children: ['child-a', 'child-b'],
				},
				'child-a': { kind: 'resource', value: 4, parentId: 'parent' },
				'child-b': { kind: 'resource', value: 3, parentId: 'parent' },
			},
			orderedValueIds: ['parent', 'child-a', 'child-b'],
			resources: {},
			stats: {},
			buildings: [],
			lands: [],
			passives: [],
		};

		const diffs = diffPlayerSnapshots(before, after);

		expect(diffs).toEqual([
			{ type: 'resource', key: 'parent', before: 5, after: 7 },
			{ type: 'resource', key: 'child-a', before: 3, after: 4 },
			{ type: 'resource', key: 'child-b', before: 2, after: 3 },
		]);
	});
});
