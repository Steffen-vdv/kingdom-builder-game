import { describe, it, expect } from 'vitest';
import { developmentCountAllEvaluator } from '../../src/evaluators/development_count_all';
import { createTestEngine } from '../helpers';
import { Land } from '../../src/state/index';

describe('development-count-all evaluator', () => {
	it('returns 0 when no developments exist', () => {
		const context = createTestEngine({ skipInitialSetup: true });
		context.activePlayer.lands = [new Land('empty', 2)];
		const result = developmentCountAllEvaluator(
			{ type: 'development-count-all' },
			context,
		);
		expect(result).toBe(0);
	});

	it('sums developments across all lands', () => {
		const context = createTestEngine({ skipInitialSetup: true });
		const land1 = new Land('l1', 3);
		land1.developments = ['farm', 'mine'];
		const land2 = new Land('l2', 2);
		land2.developments = ['cottage'];
		const land3 = new Land('l3', 1);
		land3.developments = [];
		context.activePlayer.lands = [land1, land2, land3];

		const result = developmentCountAllEvaluator(
			{ type: 'development-count-all' },
			context,
		);
		expect(result).toBe(3);
	});
});
