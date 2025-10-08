import { describe, expect, it } from 'vitest';
import { deepClone } from '../../src/runtime/player_snapshot';

describe('deepClone', () => {
	it('falls back to manual clone when structuredClone throws', () => {
		const original = {
			arr: [1, { nested: 'value' }],
			obj: { count: 3, inner: { flag: true } },
			fn: () => 0,
		};

		expect(() => structuredClone(original)).toThrow();

		const clone = deepClone(original);

		expect(clone).not.toBe(original);
		expect(clone.arr).not.toBe(original.arr);
		expect(clone.arr[1]).not.toBe(original.arr[1]);
		expect(clone.obj).not.toBe(original.obj);
		expect(clone.obj.inner).not.toBe(original.obj.inner);
		expect(clone.fn).toBe(original.fn);
		expect(clone.arr[1]).toEqual({ nested: 'value' });
		expect(clone.obj.inner).toEqual({ flag: true });
	});
});
