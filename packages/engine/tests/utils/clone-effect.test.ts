import { describe, expect, it } from 'vitest';
import type { EffectDef } from '@kingdom-builder/protocol';
import { cloneEffectDef, cloneEffectList } from '../../src/utils';

describe('clone effect helpers', () => {
	it('deeply clones single effect definitions', () => {
		const params = {
			amount: 5,
			nested: { multiplier: 3, history: ['initial'] },
		};
		const meta = {
			tags: ['primary'],
			origin: { id: 'root', flags: ['alpha'] },
		};
		const evaluator = {
			type: 'dummy',
			params: { nested: { count: 4, memo: ['seed'] } },
		};
		const childEffect: EffectDef = {
			type: 'resource',
			method: 'add',
			params: { amount: 1, nested: { depth: 2 } },
			meta: { notes: ['child'], nested: { id: 'child' } },
		};
		const original: EffectDef = {
			type: 'resource',
			method: 'add',
			params,
			meta,
			evaluator,
			effects: [childEffect],
		};

		const clone = cloneEffectDef(original);

		expect(clone).not.toBe(original);
		expect(clone).toStrictEqual(original);

		params.nested.multiplier = 9;
		params.nested.history.push('mutated');
		meta.tags.push('mutated');
		meta.origin.flags.push('beta');
		if (evaluator.params?.nested) {
			evaluator.params.nested.count = 10;
		}
		if (childEffect.params?.nested) {
			childEffect.params.nested.depth = 8;
		}
		original.effects?.push({
			type: 'resource',
			method: 'set',
			params: { amount: 7 },
		});

		expect(clone.params?.nested).toEqual({
			multiplier: 3,
			history: ['initial'],
		});
		expect(clone.meta?.tags).toEqual(['primary']);
		expect(clone.meta?.origin).toEqual({ id: 'root', flags: ['alpha'] });
		expect(clone.evaluator?.params).toEqual({
			nested: { count: 4, memo: ['seed'] },
		});
		expect(clone.effects?.length).toBe(1);
		expect(clone.effects?.[0]?.params).toEqual({
			amount: 1,
			nested: { depth: 2 },
		});
	});

	it('clones effect lists without leaking references', () => {
		const first: EffectDef = {
			type: 'resource',
			method: 'add',
			params: { amount: 2, nested: { path: ['a'] } },
			effects: [
				{
					type: 'resource',
					method: 'add',
					params: { amount: 1, nested: { level: 1 } },
				},
			],
		};
		const second: EffectDef = {
			type: 'resource',
			method: 'set',
			params: { amount: 5, nested: { path: ['b'] } },
			meta: { origin: { id: 'secondary' } },
		};
		const list = [first, second];

		const clone = cloneEffectList(list);

		expect(clone).not.toBe(list);
		expect(clone).toStrictEqual(list);

		list.push({
			type: 'resource',
			method: 'remove',
			params: { amount: 1 },
		});
		if (first.params?.nested) {
			first.params.nested.path.push('mut');
		}
		const firstChild = first.effects?.[0];
		if (firstChild?.params) {
			firstChild.params.nested = { level: 3 };
		}
		if (second.meta) {
			second.meta.origin = { id: 'secondary', changed: true };
		}

		expect(clone?.length).toBe(2);
		expect(clone?.[0]?.params).toEqual({
			amount: 2,
			nested: { path: ['a'] },
		});
		expect(clone?.[0]?.effects?.[0]?.params).toEqual({
			amount: 1,
			nested: { level: 1 },
		});
		expect(clone?.[1]?.meta).toEqual({ origin: { id: 'secondary' } });
	});
});
