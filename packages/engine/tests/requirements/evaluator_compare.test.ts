import { describe, it, expect } from 'vitest';
import { evaluatorCompare } from '../../src/requirements/evaluator_compare';
import { Operators } from '../../src/evaluators/compare';
import { createTestEngine } from '../helpers';
import { createContentFactory } from '../factories/content';
import { advance } from '../../src';
import { Stat } from '@kingdom-builder/contents';

describe('evaluator:compare requirement', () => {
	it('compares stat values', () => {
		const ctx = createTestEngine(createContentFactory());
		while (ctx.game.currentPhase !== 'main') {
			advance(ctx);
		}
		ctx.activePlayer.stats[Stat.maxPopulation] = 2;
		const req = {
			params: {
				left: { type: 'stat', params: { key: Stat.maxPopulation } },
				right: 1,
				operator: Operators.GreaterThan,
			},
		} as unknown as Parameters<typeof evaluatorCompare>[0];
		expect(evaluatorCompare(req, ctx)).toBe(true);
		req.params.operator = Operators.LessThanOrEqual;
		expect(evaluatorCompare(req, ctx)).toBe('Requirement failed');
		req.params.operator = Operators.Equal;
		req.params.right = 2;
		expect(evaluatorCompare(req, ctx)).toBe(true);
		req.params.operator = Operators.NotEqual;
		expect(evaluatorCompare(req, ctx)).toBe('Requirement failed');
	});
});
