import { describe, it, expect } from 'vitest';
import { EVALUATORS } from '../../src/evaluators/index.ts';
import { createTestEngine } from '../helpers.ts';

describe('compare evaluator', () => {
	const run = (
		left: number,
		right: number,
		operator: 'lt' | 'lte' | 'gt' | 'gte' | 'eq' | 'ne',
	) => {
		const ctx = createTestEngine();
		return EVALUATORS.get('compare')(
			{ type: 'compare', params: { left, right, operator } },
			ctx,
		);
	};

	it('returns 1 for lt when left < right', () => {
		expect(run(5, 10, 'lt')).toBe(1);
		expect(run(10, 5, 'lt')).toBe(0);
	});

	it('returns 1 for lte when left <= right', () => {
		expect(run(5, 10, 'lte')).toBe(1);
		expect(run(10, 10, 'lte')).toBe(1);
		expect(run(10, 5, 'lte')).toBe(0);
	});

	it('returns 1 for gt when left > right', () => {
		expect(run(10, 5, 'gt')).toBe(1);
		expect(run(5, 10, 'gt')).toBe(0);
	});

	it('returns 1 for gte when left >= right', () => {
		expect(run(10, 5, 'gte')).toBe(1);
		expect(run(10, 10, 'gte')).toBe(1);
		expect(run(5, 10, 'gte')).toBe(0);
	});

	it('returns 1 for eq when left === right', () => {
		expect(run(10, 10, 'eq')).toBe(1);
		expect(run(10, 5, 'eq')).toBe(0);
	});

	it('returns 1 for ne when left !== right', () => {
		expect(run(10, 5, 'ne')).toBe(1);
		expect(run(10, 10, 'ne')).toBe(0);
	});
});
