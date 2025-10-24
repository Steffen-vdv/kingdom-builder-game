import { describe, expect, it } from 'vitest';

import { RESOURCE_V2_DEFINITION_SCAFFOLD, assignSharedMetadata, createOrderGenerator, createSharedMetadata, orderByAscending } from '../src/resourceV2';

interface OrderableStub {
	readonly id: string;
	readonly order: number;
}

describe('RESOURCE_V2_DEFINITION_SCAFFOLD', () => {
	it('starts empty for migrating definitions and groups', () => {
		expect(RESOURCE_V2_DEFINITION_SCAFFOLD.definitions).toEqual([]);
		expect(RESOURCE_V2_DEFINITION_SCAFFOLD.groups).toEqual([]);
		expect(Object.isFrozen(RESOURCE_V2_DEFINITION_SCAFFOLD.definitions)).toBe(true);
		expect(Object.isFrozen(RESOURCE_V2_DEFINITION_SCAFFOLD.groups)).toBe(true);
	});
});

describe('createOrderGenerator', () => {
	it('increments sequentially from the default starting order', () => {
		const nextOrder = createOrderGenerator();

		expect(nextOrder()).toBe(0);
		expect(nextOrder()).toBe(1);
		expect(nextOrder()).toBe(2);
	});
});

describe('orderByAscending', () => {
	it('sorts arbitrary entries by their declared order', () => {
		const unordered: OrderableStub[] = [
			{ id: 'third', order: 2 },
			{ id: 'first', order: 0 },
			{ id: 'second', order: 1 },
		];

		const ordered = orderByAscending(unordered);

		expect(ordered.map((entry) => entry.id)).toEqual(['first', 'second', 'third']);
	});
});

describe('metadata helpers', () => {
	it('creates frozen metadata that can be reused across entries', () => {
		const shared = createSharedMetadata({ icon: '🪙', trackValueBreakdown: true });

		expect(Object.isFrozen(shared)).toBe(true);

		const first = assignSharedMetadata({ id: 'gold' }, shared);
		const second = assignSharedMetadata({ id: 'gold:alt' }, shared);

		expect(first.metadata).toBe(shared);
		expect(second.metadata).toBe(shared);
	});
});
