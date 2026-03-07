import { describe, it, expect } from 'vitest';
import { RngService } from '../../src/services/rng_service';

describe('RngService', () => {
	describe('constructor', () => {
		it('initializes with a seed', () => {
			const rng = new RngService(42);
			expect(rng).toBeDefined();
		});

		it('produces deterministic results from same seed', () => {
			const rng1 = new RngService(12345);
			const rng2 = new RngService(12345);

			const sequence1 = [rng1.random(), rng1.random(), rng1.random()];
			const sequence2 = [rng2.random(), rng2.random(), rng2.random()];

			expect(sequence1).toEqual(sequence2);
		});

		it('produces different results from different seeds', () => {
			const rng1 = new RngService(100);
			const rng2 = new RngService(200);

			const val1 = rng1.random();
			const val2 = rng2.random();

			expect(val1).not.toEqual(val2);
		});
	});

	describe('random', () => {
		it('returns values between 0 and 1', () => {
			const rng = new RngService(999);

			for (let i = 0; i < 100; i++) {
				const val = rng.random();
				expect(val).toBeGreaterThanOrEqual(0);
				expect(val).toBeLessThan(1);
			}
		});

		it('produces varied distribution', () => {
			const rng = new RngService(42);
			const values = Array.from({ length: 1000 }, () => rng.random());

			// Check that we have values across the range
			const hasLow = values.some((val) => val < 0.25);
			const hasMidLow = values.some((val) => val >= 0.25 && val < 0.5);
			const hasMidHigh = values.some((val) => val >= 0.5 && val < 0.75);
			const hasHigh = values.some((val) => val >= 0.75);

			expect(hasLow).toBe(true);
			expect(hasMidLow).toBe(true);
			expect(hasMidHigh).toBe(true);
			expect(hasHigh).toBe(true);
		});
	});

	describe('randomInt', () => {
		it('returns integers between 0 and max-1', () => {
			const rng = new RngService(777);

			for (let i = 0; i < 100; i++) {
				const val = rng.randomInt(10);
				expect(val).toBeGreaterThanOrEqual(0);
				expect(val).toBeLessThan(10);
				expect(Number.isInteger(val)).toBe(true);
			}
		});

		it('respects upper bound', () => {
			const rng = new RngService(123);
			const values = Array.from({ length: 100 }, () => rng.randomInt(5));

			expect(values.every((val) => val >= 0 && val < 5)).toBe(true);
		});
	});

	describe('weightedSelect', () => {
		it('throws on empty weights array', () => {
			const rng = new RngService(1);
			expect(() => rng.weightedSelect([])).toThrow(
				'Cannot select from empty weights array',
			);
		});

		it('throws on zero total weight', () => {
			const rng = new RngService(1);
			expect(() => rng.weightedSelect([0, 0, 0])).toThrow(
				'Total weight must be positive',
			);
		});

		it('returns index within bounds', () => {
			const rng = new RngService(42);
			const weights = [10, 20, 30];

			for (let i = 0; i < 100; i++) {
				const idx = rng.weightedSelect(weights);
				expect(idx).toBeGreaterThanOrEqual(0);
				expect(idx).toBeLessThan(weights.length);
			}
		});

		it('respects weight distribution', () => {
			const rng = new RngService(999);
			const weights = [1, 0, 0]; // Only first option should be selected
			const selections = Array.from({ length: 100 }, () =>
				rng.weightedSelect(weights),
			);

			// All selections should be index 0
			expect(selections.every((s) => s === 0)).toBe(true);
		});

		it('heavily weighted options are selected more often', () => {
			const rng = new RngService(12345);
			const weights = [10, 90]; // Second option has 90% weight
			const counts = [0, 0];

			for (let i = 0; i < 1000; i++) {
				counts[rng.weightedSelect(weights)]++;
			}

			// Second option should be selected significantly more often
			expect(counts[1]).toBeGreaterThan(counts[0] * 5);
		});
	});

	describe('shuffle', () => {
		it('returns the same array reference', () => {
			const rng = new RngService(1);
			const arr = [1, 2, 3, 4, 5];
			const result = rng.shuffle(arr);
			expect(result).toBe(arr);
		});

		it('preserves all elements', () => {
			const rng = new RngService(42);
			const arr = [1, 2, 3, 4, 5];
			rng.shuffle(arr);

			expect(arr.sort()).toEqual([1, 2, 3, 4, 5]);
		});

		it('produces deterministic shuffles from same seed', () => {
			const arr1 = [1, 2, 3, 4, 5];
			const arr2 = [1, 2, 3, 4, 5];

			new RngService(100).shuffle(arr1);
			new RngService(100).shuffle(arr2);

			expect(arr1).toEqual(arr2);
		});

		it('handles empty arrays', () => {
			const rng = new RngService(1);
			const arr: number[] = [];
			expect(() => rng.shuffle(arr)).not.toThrow();
			expect(arr).toEqual([]);
		});

		it('handles single-element arrays', () => {
			const rng = new RngService(1);
			const arr = [42];
			rng.shuffle(arr);
			expect(arr).toEqual([42]);
		});
	});

	describe('pick', () => {
		it('throws on empty array', () => {
			const rng = new RngService(1);
			expect(() => rng.pick([])).toThrow('Cannot pick from empty array');
		});

		it('returns an element from the array', () => {
			const rng = new RngService(42);
			const arr = ['a', 'b', 'c', 'd'];

			for (let i = 0; i < 100; i++) {
				const picked = rng.pick(arr);
				expect(arr).toContain(picked);
			}
		});

		it('produces deterministic picks from same seed', () => {
			const arr = ['x', 'y', 'z'];
			const pick1 = new RngService(555).pick(arr);
			const pick2 = new RngService(555).pick(arr);
			expect(pick1).toEqual(pick2);
		});

		it('works with readonly arrays', () => {
			const rng = new RngService(1);
			const arr: readonly string[] = ['a', 'b', 'c'];
			expect(() => rng.pick(arr)).not.toThrow();
		});
	});
});
