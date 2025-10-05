import { describe, it, expect } from 'vitest';
import { evaluatorCompare } from '../../src/requirements/evaluator_compare';
import { createTestEngine } from '../helpers';
import { createContentFactory } from '../factories/content';
import { advance } from '../../src';
import { Stat, PhaseId } from '@kingdom-builder/contents';

describe('evaluator:compare requirement', () => {
	it('compares stat values', () => {
		const ctx = createTestEngine(createContentFactory());
		while (ctx.game.currentPhase !== PhaseId.Main) {
			advance(ctx);
		}
		ctx.activePlayer.stats[Stat.maxPopulation] = 2;
		const req = {
			params: {
				left: { type: 'stat', params: { key: Stat.maxPopulation } },
				right: 1,
				operator: 'gt',
			},
		} as unknown as Parameters<typeof evaluatorCompare>[0];
		expect(evaluatorCompare(req, ctx)).toBe(true);
		req.params.operator = 'lte';
		expect(evaluatorCompare(req, ctx)).toBe('Requirement failed');
		req.params.operator = 'eq';
		req.params.right = 2;
		expect(evaluatorCompare(req, ctx)).toBe(true);
		req.params.operator = 'ne';
		expect(evaluatorCompare(req, ctx)).toBe('Requirement failed');
	});
});
