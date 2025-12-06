import { describe, it, expect } from 'vitest';
import { landEvaluator } from '../../src/evaluators/land.ts';
import { createTestEngine } from '../helpers.ts';
import { Land } from '../../src/state/index.ts';

const noopDefinition = { type: 'land', id: 'unused' } as const;

describe('land evaluator', () => {
	it('sums available slots without counting overused land', () => {
		const engineContext = createTestEngine();
		const fertile = new Land('fertile', 3);
		fertile.slotsUsed = 1;
		const overworked = new Land('overworked', 2);
		overworked.slotsUsed = 5;
		const fresh = new Land('fresh', 1);
		fresh.slotsUsed = 0;

		engineContext.activePlayer.lands = [fertile, overworked, fresh];

		const available = landEvaluator(noopDefinition, engineContext);
		expect(available).toBe(3);
	});
});
