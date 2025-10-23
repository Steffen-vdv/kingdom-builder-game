import { describe, expect, it } from 'vitest';
import { landEvaluator } from '../../src/evaluators/land';
import type { EngineContext } from '../../src/context';

describe('landEvaluator', () => {
	it('sums available slots across all lands', () => {
		const context = {
			activePlayer: {
				lands: [
					{
						id: 'land-a',
						slotsMax: 3,
						slotsUsed: 1,
					},
					{
						id: 'land-b',
						slotsMax: 2,
						slotsUsed: 5,
					},
					{
						id: 'land-c',
						slotsMax: 1,
						slotsUsed: 0,
					},
				],
			},
		} as unknown as EngineContext;

		const result = landEvaluator({}, context);

		expect(result).toBe(3);
	});

	it('returns zero when the active player has no lands', () => {
		const context = {
			activePlayer: {
				lands: [],
			},
		} as unknown as EngineContext;

		const result = landEvaluator({}, context);

		expect(result).toBe(0);
	});
});
